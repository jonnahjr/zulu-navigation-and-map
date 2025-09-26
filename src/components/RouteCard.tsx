import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteStep } from '../types/navigation';

interface RouteCardProps {
  steps: RouteStep[];
}

const RouteCard: React.FC<RouteCardProps> = ({ steps }) => (
  <View style={styles.card} accessible accessibilityLabel="Route directions card">
    <Text style={styles.title} accessible accessibilityLabel="Directions title">Step-by-Step Directions</Text>
    {steps.map((step, idx) => (
      <View key={idx} style={styles.step} accessible accessibilityLabel={`Step ${idx + 1}`}>
        <Text style={styles.instruction} accessible accessibilityLabel={`Instruction: ${step.instruction}`}>{step.instruction}</Text>
        <Text style={styles.details} accessible accessibilityLabel={`Details: ${step.distance} ${step.duration}`}>{step.distance} • {step.duration}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    padding: 16,
    margin: 8,
    shadowColor: '#00FFFF',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
  },
  title: { fontWeight: 'bold', fontSize: 18, marginBottom: 8, color: '#FFF' },
  step: { marginBottom: 10 },
  instruction: { fontSize: 16, color: '#FFF' },
  details: { color: '#00FFFF', fontSize: 12 },
});

export default RouteCard;
