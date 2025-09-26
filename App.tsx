import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useWebSocket } from './src/hooks/useWebSocket';

// Create a context for real-time data
export const RealtimeContext = React.createContext<any>(null);

// Bootstrap app lazily to avoid importing unimodules at module-eval time which
// can trigger native initialization (and on some Android versions cause a
// SecurityException before AppRegistry.registerComponent is called).
const App: React.FC = () => {
  const [ReadyRoot, setReadyRoot] = useState<React.ComponentType | null>(null);

  // Initialize WebSocket connection
  const realtimeData = useWebSocket('user_' + Date.now(), 'Navigator User');

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
        <RealtimeContext.Provider value={realtimeData}>
          {/* @ts-ignore - SafeAreaProvider typed as any when required dynamically */}
          <SafeAreaProvider>
            {/* @ts-ignore */}
            <StatusBar style="auto" />
            {/* AppNavigator is default export */}
            {/* @ts-ignore */}
            <AppNavigatorModule.default />
          </SafeAreaProvider>
        </RealtimeContext.Provider>
      );

      if (mounted) setReadyRoot(() => Root);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to require app modules dynamically', e);
    }
    return () => { mounted = false; };
  }, [realtimeData]);

  if (!ReadyRoot) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#FFF', fontSize: 18 }}>Loading Zulu Navigator...</Text>
        <Text style={{ color: '#00FFFF', fontSize: 14, marginTop: 10 }}>
          {realtimeData.isConnected ? '🟢 Connected to real-time server' : '🟡 Connecting...'}
        </Text>
      </View>
    );
  }

  const Root = ReadyRoot;
  return <Root />;
};

export default App;
