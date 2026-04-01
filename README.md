# LinkFlow React Native SDK

Production-ready React Native SDK for mobile attribution and deep linking.

## Features

| Feature | Description |
|---|---|
| **Deferred Deep Linking** | Routes users to specific in-app content after install, even when the app was not present at click time |
| **Universal Links & App Links** | Native iOS Universal Links and Android App Links for seamless, browser-free handoff |
| **Custom URL Schemes** | Full support for custom URI scheme handling as a reliable fallback |
| **Install Attribution** | Deterministic and probabilistic attribution to match installs back to the originating click |
| **In-App Event Tracking** | Track post-install events and revenue to measure campaign performance end-to-end |
| **Cross-Platform API** | A unified JavaScript API that works identically on iOS and Android |
| **TypeScript** | Fully typed with bundled declaration files — no `@types` package required |
| **React Hooks** | `useAttribution` hook for ergonomic integration into functional components |

## Installation

```bash
npm install @linkflow/react-native-sdk
# or
yarn add @linkflow/react-native-sdk
```

### iOS Setup

```bash
cd ios && pod install
```

Add to `Info.plist`:
```xml
<key>NSUserTrackingUsageDescription</key>
<string>We use tracking to measure ad performance</string>
```

### Android Setup

No additional setup required!

## Quick Start

### 1. Initialize SDK

```typescript
import LinkFlow from '@linkflow/react-native-sdk';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Initialize SDK
    LinkFlow.initialize({
      apiBaseURL: 'https://thelinkflow.app',
      enableLogging: __DEV__
    });

    // Set attribution callback
    LinkFlow.setAttributionCallback((result) => {
      if (result.attributed) {
        console.log('Deep Link:', result.deepLinkValue);
        console.log('Campaign:', result.campaignData);

        // Navigate based on deep link
        if (result.deepLinkValue?.includes('product')) {
          navigation.navigate('Product', {
            ...result.deepLinkParams
          });
        }
      }
    });

    // Handle app launch
    LinkFlow.handleAppLaunch();

    return () => LinkFlow.destroy();
  }, []);

  return <YourApp />;
}
```

### 2. Track Events

```typescript
import LinkFlow from '@linkflow/react-native-sdk';

// Track purchase
await LinkFlow.trackEvent('purchase', {
  order_id: '12345',
  currency: 'USD'
}, 99.99);

// Track product view
await LinkFlow.trackEvent('product_view', {
  product_id: 'abc123'
});
```

### 3. Handle Deep Links

Deep links are automatically handled and delivered via the attribution callback:

```typescript
LinkFlow.setAttributionCallback((result) => {
  if (result.deepLinkValue) {
    // Parse and navigate
    const url = new URL(result.deepLinkValue);
    if (url.pathname.includes('/product/')) {
      const productId = url.pathname.split('/').pop();
      navigation.navigate('Product', { id: productId });
    }
  }
});
```

## API Reference

### `LinkFlow.initialize(config)`

Initialize the SDK.

```typescript
await LinkFlow.initialize({
  apiBaseURL: 'https://thelinkflow.app',
  enableLogging: true
});
```

### `LinkFlow.setAttributionCallback(callback)`

Set callback for attribution results.

```typescript
LinkFlow.setAttributionCallback((result) => {
  console.log(result);
});
```

### `LinkFlow.handleAppLaunch()`

Handle app launch and resolve attribution.

```typescript
await LinkFlow.handleAppLaunch();
```

### `LinkFlow.trackEvent(eventName, params, revenue)`

Track in-app events.

```typescript
await LinkFlow.trackEvent('purchase', { order_id: '123' }, 99.99);
```

### `LinkFlow.getAttributionResult()`

Get attribution result if available.

```typescript
const result = await LinkFlow.getAttributionResult();
```

## TypeScript Support

Full TypeScript support included:

```typescript
import LinkFlow, { AttributionResult } from '@linkflow/react-native-sdk';

const handleAttribution = (result: AttributionResult) => {
  if (result.attributed) {
    // TypeScript knows all properties
    console.log(result.deepLinkValue);
    console.log(result.campaignData);
  }
};
```

## Requirements

- React Native 0.60+
- iOS 13.0+
- Android API 21+

## License

MIT License
