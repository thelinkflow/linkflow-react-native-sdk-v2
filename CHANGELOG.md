# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-02

### Added
- **Zero-config native integration**: vendored canonical iOS Swift and Android Kotlin source inside the package; consumers no longer need a separate CocoaPod or Maven dependency. Native autolinking handles iOS (`pod install`) and Android (Gradle).
- New listener-based JS API: `addAttributionListener(cb) -> EmitterSubscription`, `addDeepLinkListener(cb)`, `addErrorListener(cb)`. Returned subscriptions must be cleaned up with `.remove()`.
- iOS bridge (`ios/LinkFlowSDKModule.swift`): `RCTEventEmitter` with cached last `AttributionResult`.
- Android bridge (`android/src/main/kotlin/com/linkflow/sdk/rn/LinkFlowSDKModule.kt`): `ReactContextBaseJavaModule` with cached last result and emit guards.
- `LinkFlowSDK.podspec` at repo root with `install_modules_dependencies` / `React-Core` fallback.
- `react-native.config.js` autolinking config.

### Changed
- `src/index.tsx`: rewritten for leak-free listener management via internal subscription handle; stricter `assertInitialized` guards.

### Deprecated
- `setAttributionCallback(callback)` — kept as a back-compat shim. Use `addAttributionListener` instead. Will be removed in 2.0.0.

## [1.0.2] - 2024-12-01

### Added
- Initial standalone release extracted from main LinkFlow repository
- Full TypeScript support with bundled declaration files
- `useAttribution` React hook for functional components
- Cross-platform attribution resolution (iOS/Android)
- In-app event tracking with revenue support
- Deep link handling via native bridge
- Configurable API base URL and logging

### Fixed
- Improved error handling for native module bridge failures

## [1.0.1] - 2024-11-15

### Fixed
- TypeScript type exports for `AttributionResult`

## [1.0.0] - 2024-11-01

### Added
- Initial release
- React Native bridge to native iOS/Android SDKs
- Attribution callback system
- Event tracking API
- Deep link listener
