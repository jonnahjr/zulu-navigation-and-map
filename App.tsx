import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';

// Bootstrap app lazily to avoid importing unimodules at module-eval time which
// can trigger native initialization (and on some Android versions cause a
// SecurityException before AppRegistry.registerComponent is called).
const App: React.FC = () => {
  const [ReadyRoot, setReadyRoot] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    let mounted = true;
    try {
      // Use synchronous require inside effect to avoid Metro asyncRequire resolution issues
      // while still delaying expensive/native initialization until after startup.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SafeAreaProvider = require('react-native-safe-area-context').SafeAreaProvider;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const StatusBar = require('expo-status-bar').StatusBar;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AppNavigatorModule = require('./src/navigation/AppNavigator');

      const Root: React.FC = () => (
        // @ts-ignore - SafeAreaProvider typed as any when required dynamically
        <SafeAreaProvider>
          {/* @ts-ignore */}
          <StatusBar style="auto" />
          {/* AppNavigator is default export */}
          {/* @ts-ignore */}
          <AppNavigatorModule.default />
        </SafeAreaProvider>
      );

      if (mounted) setReadyRoot(() => Root);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to require app modules dynamically', e);
    }
    return () => { mounted = false; };
  }, []);

  if (!ReadyRoot) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Loading App...</Text>
      </View>
    );
  }

  const Root = ReadyRoot;
  return <Root />;
};

export default App;
