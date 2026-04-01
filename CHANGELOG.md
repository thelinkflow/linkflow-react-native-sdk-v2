# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
