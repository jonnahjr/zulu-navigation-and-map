import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from './design/theme';

type Mode = 'driving' | 'walking' | 'bicycling' | 'transit';

export default function DirectionsMiniPanel({ mode, onModeChange, onStart, onSave, onShare, eta, distance }: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onStart: () => void;
  onSave?: () => void;
  onShare?: () => void;
  eta?: string;
  distance?: string;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.modes}>
        {(['driving', 'walking', 'bicycling', 'transit'] as Mode[]).map((m) => (
          <TouchableOpacity key={m} onPress={() => onModeChange(m)} style={[styles.modeBtn, mode === m && styles.modeActive]}>
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m[0].toUpperCase() + m.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.infoRow}>
        <View>
          <Text style={styles.infoLabel}>ETA</Text>
          <Text style={styles.infoVal}>{eta ?? '—'}</Text>
        </View>
        <View>
          <Text style={styles.infoLabel}>Distance</Text>
          <Text style={styles.infoVal}>{distance ?? '—'}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primary} onPress={onStart} accessibilityRole="button">
          <Text style={styles.primaryText}>Start</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghost} onPress={onSave} accessibilityRole="button">
          <Text style={styles.ghostText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghost} onPress={onShare} accessibilityRole="button">
          <Text style={styles.ghostText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.neonPrimary, width: 300 },
  modes: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  modeBtn: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 },
  modeActive: { backgroundColor: colors.neonPrimary },
  modeText: { color: '#fff', fontSize: 12 },
  modeTextActive: { color: '#000', fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  infoLabel: { color: '#aaa', fontSize: 10 },
  infoVal: { color: '#fff', fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  primary: { backgroundColor: colors.neonAccent, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 10 },
  primaryText: { color: '#000', fontWeight: '700' },
  ghost: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#555' },
  ghostText: { color: '#fff' },
});
