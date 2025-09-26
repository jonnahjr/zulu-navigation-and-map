import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';

// Dynamically attempt to load expo-blur's BlurView; fall back to translucent View if not installed
let BlurView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('expo-blur');
  BlurView = mod.BlurView || mod.default?.BlurView || null;
} catch (e) {
  BlurView = null;
}

const BlurFallback: React.FC<ViewProps & { intensity?: number }> = ({ children, style, intensity = 50, ...rest }) => {
  if (BlurView) {
    return (
      // @ts-ignore
      <BlurView intensity={intensity} style={[styles.wrapper, style]} {...rest}>
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[styles.fallback, style]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { padding: 8, borderRadius: 12, overflow: 'hidden' },
  fallback: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)' },
});

export default BlurFallback;
