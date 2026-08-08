#!/usr/bin/env node
/**
 * Syncs (or verifies) the native SDK sources vendored into this package.
 *
 * Why this exists
 * ---------------
 * `android/src/main/kotlin/com/linkflow/sdk/*.kt` and `ios/*.swift` are copies
 * of the standalone linkflow-android-sdk-v2 and linkflow-ios-sdk-v2
 * repositories. Vendoring keeps integration zero-config — no Maven coordinate,
 * no extra pod — but it means a fix made upstream does not reach React Native
 * users until a human remembers to copy it over, and nothing anywhere fails
 * when they forget. The copies drift silently, and the symptom is a React
 * Native app quietly running months-old attribution logic.
 *
 * `check` makes that drift a CI failure. `update` performs the copy.
 *
 * Usage
 * -----
 *   node scripts/sync-native.mjs check              verify against the pins
 *   node scripts/sync-native.mjs update             copy from the pinned commits
 *   node scripts/sync-native.mjs update --ref main  move the pins, then copy
 *
 * No dependencies: git plus Node's standard library.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(repoRoot, 'native-sources.json');

const mode = process.argv[2] ?? 'check';
const refFlagIndex = process.argv.indexOf('--ref');
const refOverride = refFlagIndex === -1 ? null : process.argv[refFlagIndex + 1];

if (!['check', 'update'].includes(mode)) {
  console.error(`Unknown mode "${mode}". Expected "check" or "update".`);
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const git = (args, cwd) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

/**
 * Fetches one upstream revision into a scratch clone.
 *
 * A blobless partial clone keeps this cheap enough to run on every pull
 * request; the alternative (full history for two repositories) is a lot of
 * transfer for four Kotlin files.
 */
function fetchSource(source, workDir) {
  const dir = path.join(workDir, source.name);
  fs.mkdirSync(dir, { recursive: true });

  const wanted = refOverride ?? source.commit ?? source.ref;

  git(['init', '--quiet'], dir);
  git(['remote', 'add', 'origin', source.repo], dir);

  try {
    git(['fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', wanted], dir);
  } catch {
    // Fetching a bare SHA needs uploadpack.allowReachableSHA1InWant on the
    // server, which GitHub enables, but a ref name is the reliable fallback.
    git(['fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', source.ref], dir);
  }

  git(['checkout', '--quiet', 'FETCH_HEAD'], dir);
  return { dir, commit: git(['rev-parse', 'HEAD'], dir) };
}

function run() {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'linkflow-native-sync-'));
  const drifted = [];
  const missing = [];
  let copied = 0;

  try {
    for (const source of manifest.sources) {
      const { dir, commit } = fetchSource(source, workDir);

      if (mode === 'check' && source.commit && commit !== source.commit) {
        console.error(
          `✗ ${source.name}: resolved ${commit.slice(0, 10)} but the manifest pins ` +
            `${source.commit.slice(0, 10)}. The pinned commit is no longer reachable ` +
            `from "${source.ref}".`
        );
        drifted.push(`${source.name} (pin unreachable)`);
        continue;
      }

      for (const file of source.files) {
        const upstreamPath = path.join(dir, file.from);
        const vendoredPath = path.join(repoRoot, file.to);

        if (!fs.existsSync(upstreamPath)) {
          missing.push(`${source.name}: ${file.from} does not exist upstream`);
          continue;
        }

        const upstream = fs.readFileSync(upstreamPath);

        if (!fs.existsSync(vendoredPath)) {
          if (mode === 'check') {
            drifted.push(`${file.to} (missing locally)`);
          } else {
            fs.mkdirSync(path.dirname(vendoredPath), { recursive: true });
            fs.writeFileSync(vendoredPath, upstream);
            copied += 1;
            console.log(`+ ${file.to}`);
          }
          continue;
        }

        const vendored = fs.readFileSync(vendoredPath);

        if (sha256(upstream) === sha256(vendored)) continue;

        if (mode === 'check') {
          drifted.push(`${file.to} (differs from ${source.name}@${commit.slice(0, 10)})`);
        } else {
          fs.writeFileSync(vendoredPath, upstream);
          copied += 1;
          console.log(`~ ${file.to}`);
        }
      }

      if (mode === 'update') {
        source.commit = commit;
        if (refOverride) source.ref = refOverride;
      }
    }

    // Catch a vendored file that was added without being registered — it would
    // otherwise sit outside the check entirely, which is the exact blind spot
    // this script exists to remove.
    const registered = new Set([
      ...manifest.sources.flatMap((s) => s.files.map((f) => f.to)),
      ...(manifest.localOnly ?? []),
    ]);

    const vendoredDirs = ['android/src/main/kotlin/com/linkflow/sdk', 'ios'];
    for (const dir of vendoredDirs) {
      const absolute = path.join(repoRoot, dir);
      if (!fs.existsSync(absolute)) continue;

      const walk = (current) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (/\.(kt|swift|m)$/.test(entry.name)) {
            const rel = path.relative(repoRoot, full).split(path.sep).join('/');
            if (!registered.has(rel)) {
              missing.push(
                `${rel} is not listed in native-sources.json (add it to "files" or "localOnly")`
              );
            }
          }
        }
      };
      walk(absolute);
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }

  if (missing.length > 0) {
    console.error('\nUnregistered or missing sources:');
    for (const item of missing) console.error(`  - ${item}`);
  }

  if (mode === 'check') {
    if (drifted.length > 0 || missing.length > 0) {
      if (drifted.length > 0) {
        console.error('\nVendored native sources have drifted from upstream:');
        for (const item of drifted) console.error(`  - ${item}`);
      }
      console.error(
        '\nRun `npm run sync:native` to pull the upstream versions in, then commit the result.'
      );
      process.exit(1);
    }

    console.log('✓ Vendored native sources match their pinned upstream commits.');
    return;
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    copied === 0
      ? '✓ Already up to date; pins refreshed.'
      : `✓ Updated ${copied} file(s). Review the diff and commit.`
  );

  if (missing.length > 0) process.exit(1);
}

run();
