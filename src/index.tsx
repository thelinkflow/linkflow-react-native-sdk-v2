import { NativeModules, NativeEventEmitter, Platform, Linking } from 'react-native';

const LINKING_ERROR =
  `The package '@linkflow/react-native-sdk' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- Run 'pod install'\n", default: '' }) +
  '- Rebuild the app after installing the package\n' +
  '- You are not using Expo Go\n';

const LinkFlowSDK = NativeModules.LinkFlowSDK
  ? NativeModules.LinkFlowSDK
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

const eventEmitter = new NativeEventEmitter(LinkFlowSDK);

// Types
export interface AttributionResult {
  attributed: boolean;
  deepLinkValue?: string;
  deepLinkParams?: Record<string, any>;
  campaignData?: Record<string, any>;
}

export interface LinkFlowConfig {
  apiBaseURL?: string;
  enableLogging?: boolean;
}

export type AttributionCallback = (result: AttributionResult) => void;

/**
 * LinkFlow React Native SDK
 *
 * Provides mobile attribution and deep linking for React Native apps
 */
class LinkFlow {
  private static initialized = false;
  private static attributionCallback?: AttributionCallback;
  private static linkingSubscription?: any;

  /**
   * Initialize the LinkFlow SDK
   *
   * @param config Configuration options
   * @returns Promise that resolves when initialized
   *
   * @example
   * ```typescript
   * await LinkFlow.initialize({
   *   apiBaseURL: 'https://thelinkflow.app',
   *   enableLogging: __DEV__
   * });
   * ```
   */
  static async initialize(config: LinkFlowConfig = {}): Promise<void> {
    if (this.initialized) {
      console.warn('LinkFlow SDK already initialized');
      return;
    }

    const { apiBaseURL = 'https://thelinkflow.app', enableLogging = false } = config;

    try {
      await LinkFlowSDK.initialize(apiBaseURL, enableLogging);
      this.initialized = true;

      // Set up deep link listener
      this.setupDeepLinkListener();

      console.log('LinkFlow SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LinkFlow SDK:', error);
      throw error;
    }
  }

  /**
   * Set attribution callback
   *
   * @param callback Function to call when attribution is resolved
   *
   * @example
   * ```typescript
   * LinkFlow.setAttributionCallback((result) => {
   *   if (result.attributed) {
   *     console.log('Deep Link:', result.deepLinkValue);
   *     console.log('Campaign:', result.campaignData);
   *
   *     // Navigate based on deep link
   *     if (result.deepLinkValue?.includes('product')) {
   *       navigation.navigate('Product');
   *     }
   *   }
   * });
   * ```
   */
  static setAttributionCallback(callback: AttributionCallback): void {
    this.attributionCallback = callback;

    // Set up event listener for native callbacks
    eventEmitter.addListener('LinkFlowAttribution', (result: AttributionResult) => {
      if (this.attributionCallback) {
        this.attributionCallback(result);
      }
    });
  }

  /**
   * Handle app launch and resolve attribution
   *
   * Call this in your App component or after app mounts
   *
   * @example
   * ```typescript
   * useEffect(() => {
   *   LinkFlow.handleAppLaunch();
   * }, []);
   * ```
   */
  static async handleAppLaunch(): Promise<void> {
    if (!this.initialized) {
      throw new Error('LinkFlow SDK not initialized. Call initialize() first.');
    }

    try {
      // Get initial URL (for cold start)
      const initialUrl = await Linking.getInitialURL();

      await LinkFlowSDK.handleAppLaunch(initialUrl);
    } catch (error) {
      console.error('Error handling app launch:', error);
      throw error;
    }
  }

  /**
   * Track in-app event
   *
   * @param eventName Event name (e.g., 'purchase', 'add_to_cart')
   * @param params Event parameters (optional)
   * @param revenue Revenue amount (optional)
   *
   * @example
   * ```typescript
   * // Track purchase
   * await LinkFlow.trackEvent('purchase', {
   *   order_id: '12345',
   *   currency: 'USD'
   * }, 99.99);
   *
   * // Track product view
   * await LinkFlow.trackEvent('product_view', {
   *   product_id: 'abc123'
   * });
   * ```
   */
  static async trackEvent(
    eventName: string,
    params?: Record<string, any>,
    revenue?: number
  ): Promise<void> {
    if (!this.initialized) {
      throw new Error('LinkFlow SDK not initialized. Call initialize() first.');
    }

    try {
      await LinkFlowSDK.trackEvent(eventName, params || {}, revenue);
    } catch (error) {
      console.error('Error tracking event:', error);
      throw error;
    }
  }

  /**
   * Get attribution result (if available)
   *
   * @returns Promise with attribution result or null
   *
   * @example
   * ```typescript
   * const result = await LinkFlow.getAttributionResult();
   * if (result) {
   *   console.log('Attribution:', result);
   * }
   * ```
   */
  static async getAttributionResult(): Promise<AttributionResult | null> {
    if (!this.initialized) {
      throw new Error('LinkFlow SDK not initialized. Call initialize() first.');
    }

    try {
      return await LinkFlowSDK.getAttributionResult();
    } catch (error) {
      console.error('Error getting attribution result:', error);
      return null;
    }
  }

  /**
   * Set up deep link listener for app running state
   */
  private static setupDeepLinkListener(): void {
    if (this.linkingSubscription) {
      return;
    }

    this.linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      if (url) {
        LinkFlowSDK.handleDeepLink(url);
      }
    });
  }

  /**
   * Clean up resources
   */
  static destroy(): void {
    if (this.linkingSubscription) {
      this.linkingSubscription.remove();
      this.linkingSubscription = null;
    }

    eventEmitter.removeAllListeners('LinkFlowAttribution');
    this.initialized = false;
  }
}

export default LinkFlow;

// Export types
export { LinkFlow };
