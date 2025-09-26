import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { useWebSocket } from './src/hooks/useWebSocket';

// Create a context for real-time data
export const RealtimeContext = React.createContext<any>(null);

const App: React.FC = () => {
  // Initialize WebSocket connection (optional - doesn't block app loading)
  const realtimeData = useWebSocket('user_' + Date.now(), 'Navigator User');

  return (
    <RealtimeContext.Provider value={realtimeData}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </SafeAreaProvider>
    </RealtimeContext.Provider>
  );
};

export default App;
