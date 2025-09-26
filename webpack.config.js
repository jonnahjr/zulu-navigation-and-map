const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  config.resolve = config.resolve || {};
  config.resolve.alias = Object.assign({}, config.resolve.alias || {}, {
    // Redirect React Native's internal Platform import paths to our web shim
    'react-native/Libraries/Utilities/Platform': require.resolve('./src/shims/Platform.web.ts'),
    'react-native/Libraries/Utilities/Platform.js': require.resolve('./src/shims/Platform.web.ts'),
    'react-native/Libraries/Utilities/Platform/index.js': require.resolve('./src/shims/Platform.web.ts'),
    // Some internal imports may reference ReactNativePrivateInterface.js paths
    'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface': require.resolve('./src/shims/Platform.web.ts'),
    // Accessibility shim
    'react-native/Libraries/Components/AccessibilityInfo/legacySendAccessibilityEvent': require.resolve('./src/shims/legacySendAccessibilityEvent.web.ts'),
    'react-native/Libraries/Components/AccessibilityInfo/legacySendAccessibilityEvent.js': require.resolve('./src/shims/legacySendAccessibilityEvent.web.ts'),
    // StyleSheet platform color shim
    'react-native/Libraries/StyleSheet/PlatformColorValueTypes': require.resolve('./src/shims/PlatformColorValueTypes.web.ts'),
    'react-native/Libraries/StyleSheet/PlatformColorValueTypes.js': require.resolve('./src/shims/PlatformColorValueTypes.web.ts'),
  });

  return config;
};
