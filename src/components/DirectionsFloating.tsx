import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DirectionsMiniPanel from './DirectionsMiniPanel';
import { colors } from './design/theme';

export default function DirectionsFloating({ onStart }: { onStart?: (mode?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'driving' | 'walking' | 'bicycling' | 'transit'>('driving');
  const [eta, setEta] = useState<string | undefined>();
  const [distance, setDistance] = useState<string | undefined>();

  const toggle = () => setOpen((v) => !v);

  const handleStart = () => {
    setOpen(false);
    if (onStart) onStart(mode);
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {open && (
        <Animated.View style={styles.panelWrap}>
          <DirectionsMiniPanel
            mode={mode}
            onModeChange={(m) => setMode(m)}
            onStart={handleStart}
            onSave={() => console.log('Save route')}
            onShare={() => console.log('Share route')}
            eta={eta}
            distance={distance}
          />
        </Animated.View>
      )}
      <TouchableOpacity accessible accessibilityRole="button" accessibilityLabel="Open Directions" style={styles.fab} onPress={toggle}>
        <Ionicons name="navigate" size={20} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', right: 16, bottom: 24, alignItems: 'flex-end' },
  fab: { backgroundColor: colors.neonAccent, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  panelWrap: { marginBottom: 8, marginRight: 4 },
});
