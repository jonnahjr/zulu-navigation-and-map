import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { speakDirection } from '../utils/voiceGuidance';

type Step = { instruction: string; distance?: string; duration?: string };

const RouteSteps: React.FC<{ steps: Step[] }> = ({ steps }) => {
  if (!steps || steps.length === 0) return null;
  return (
    <View style={styles.container}>
      {steps.map((s, i) => (
        <TouchableOpacity key={i} style={styles.step} onPress={() => speakDirection(`${i + 1}. ${s.instruction}`)}>
          <Text style={styles.instruction}>{`${i + 1}. ${s.instruction}`}</Text>
          {s.distance && <Text style={styles.meta}>{s.distance} · {s.duration}</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 8 },
  step: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
  instruction: { color: '#fff' },
  meta: { color: '#9aa7b2', fontSize: 12 }
});

export default RouteSteps;
