/**
 * React Native autolinking config.
 *
 * Tells RN's autolinker where to find the iOS podspec and the Android source
 * directory. With this file present, end users only need:
 *   npm install @linkflow/react-native-sdk
 *   cd ios && pod install
 * No manual Podfile or settings.gradle changes required.
 */
module.exports = {
  dependency: {
    platforms: {
      ios: {
        podspecPath: __dirname + '/LinkFlowSDK.podspec',
      },
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.linkflow.sdk.rn.LinkFlowSDKPackage;',
        packageInstance: 'new LinkFlowSDKPackage()',
      },
    },
  },
};
