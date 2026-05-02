/**
 * @linkflow/react-native-sdk
 * Mobile attribution and deferred deep linking for React Native.
 */
import {
  Linking,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';
import type { EmitterSubscription } from 'react-native';

const LINKING_ERROR =
  `The package '@linkflow/react-native-sdk' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- Run 'pod install'\n", default: '' }) +
  '- Rebuild the app after installing the package\n' +
  '- You are not using Expo Go (use a custom dev client instead)\n';

const NativeLinkFlow = NativeModules.LinkFlowSDK
  ? NativeModules.LinkFlowSDK
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

const eventEmitter = new NativeEventEmitter(NativeLinkFlow);

// ---------- Types ----------

export interface AttributionResult {
  attributed: boolean;
  deepLinkValue?: string;
  deepLinkParams?: Record<string, any>;
  campaignData?: Record<string, any>;
}

export interface DeepLinkEvent {
  url: string;
}

export interface LinkFlowError {
  message: string;
}

export interface LinkFlowConfig {
  apiBaseURL?: string;
  enableLogging?: boolean;
}

export type AttributionCallback = (result: AttributionResult) => void;
export type DeepLinkCallback = (event: DeepLinkEvent) => void;
export type ErrorCallback = (error: LinkFlowError) => void;

// ---------- Constants ----------

const EVENT_ATTRIBUTION = 'LinkFlowAttribution';
const EVENT_DEEPLINK = 'LinkFlowDeepLink';
const EVENT_ERROR = 'LinkFlowError';

// ---------- SDK ----------

class LinkFlow {
  private static initialized = false;
  private static lastResult: AttributionResult | null = null;
  private static linkingSubscription: EmitterSubscription | null = null;
  private static internalAttributionSub: EmitterSubscription | null = null;
  private static legacyCallbackSub: EmitterSubscription | null = null;

  /**
   * Initialize the LinkFlow SDK. Must be called once at app launch before
   * any other method.
   */
  static async initialize(config: LinkFlowConfig = {}): Promise<void> {
    if (this.initialized) {
      console.warn('[LinkFlow] SDK already initialized');
      return;
    }
    const { apiBaseURL = 'https://thelinkflow.app', enableLogging = false } =
      config;

    await NativeLinkFlow.initialize(apiBaseURL, enableLogging);
    this.initialized = true;

    // Cache the most recent attribution result so consumers that subscribe
    // late can still fetch it via getLastAttributionResult().
    this.internalAttributionSub = eventEmitter.addListener(
      EVENT_ATTRIBUTION,
      (result: AttributionResult) => {
        this.lastResult = result;
      }
    );

    this.setupDeepLinkListener();
  }

  /**
   * Subscribe to attribution-resolved events. Returns a subscription you
   * MUST call `.remove()` on when the listener is no longer needed (typically
   * in a useEffect cleanup).
   */
  static addAttributionListener(
    callback: AttributionCallback
  ): EmitterSubscription {
    return eventEmitter.addListener(EVENT_ATTRIBUTION, callback);
  }

  /** Subscribe to deep link events received while the app is running. */
  static addDeepLinkListener(
    callback: DeepLinkCallback
  ): EmitterSubscription {
    return eventEmitter.addListener(EVENT_DEEPLINK, callback);
  }

  /** Subscribe to non-fatal errors emitted by the native SDK. */
  static addErrorListener(callback: ErrorCallback): EmitterSubscription {
    return eventEmitter.addListener(EVENT_ERROR, callback);
  }

  /**
   * @deprecated Use `addAttributionListener` instead. Single-callback
   * accessor kept for backward compatibility with v1.0.x consumers.
   */
  static setAttributionCallback(callback: AttributionCallback): void {
    this.legacyCallbackSub?.remove();
    this.legacyCallbackSub = eventEmitter.addListener(
      EVENT_ATTRIBUTION,
      callback
    );
  }

  /**
   * Handle app launch. Call this once after `initialize()` (typically in a
   * top-level useEffect). It triggers attribution resolution on first launch
   * and replays the cached result on subsequent launches.
   */
  static async handleAppLaunch(): Promise<void> {
    this.assertInitialized();
    const initialUrl = await Linking.getInitialURL();
    await NativeLinkFlow.handleAppLaunch(initialUrl);
  }

  /** Manually feed a deep link into the SDK (rarely needed). */
  static async handleDeepLink(url: string): Promise<void> {
    this.assertInitialized();
    await NativeLinkFlow.handleDeepLink(url);
  }

  /**
   * Track an in-app event.
   *
   * @param eventName e.g. `'purchase'`, `'add_to_cart'`
   * @param params custom event properties
   * @param revenue optional revenue amount in the project's currency
   */
  static async trackEvent(
    eventName: string,
    params?: Record<string, any>,
    revenue?: number
  ): Promise<void> {
    this.assertInitialized();
    await NativeLinkFlow.trackEvent(eventName, params || {}, revenue ?? null);
  }

  /**
   * Returns the most recent attribution result, or `null` if none has been
   * resolved yet. Reads from native cache + JS in-memory cache.
   */
  static async getAttributionResult(): Promise<AttributionResult | null> {
    this.assertInitialized();
    const native = await NativeLinkFlow.getAttributionResult();
    return native ?? this.lastResult;
  }

  /** Returns the cached result synchronously without making a native call. */
  static getLastAttributionResult(): AttributionResult | null {
    return this.lastResult;
  }

  /** Tear down all internal listeners. */
  static destroy(): void {
    this.linkingSubscription?.remove();
    this.linkingSubscription = null;
    this.internalAttributionSub?.remove();
    this.internalAttributionSub = null;
    this.legacyCallbackSub?.remove();
    this.legacyCallbackSub = null;
    this.initialized = false;
    this.lastResult = null;
  }

  private static setupDeepLinkListener(): void {
    if (this.linkingSubscription) return;
    this.linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      if (url) {
        NativeLinkFlow.handleDeepLink(url).catch((err: unknown) =>
          console.error('[LinkFlow] handleDeepLink failed:', err)
        );
      }
    });
  }

  private static assertInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        '[LinkFlow] SDK not initialized. Call LinkFlow.initialize() first.'
      );
    }
  }
}

export default LinkFlow;
export { LinkFlow };
