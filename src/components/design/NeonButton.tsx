import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from './theme';

const NeonButton: React.FC<any> = ({ children, onPress, style }) => (
  <TouchableOpacity onPress={onPress} style={[styles.btn, style]}>
    <Text style={styles.text}>{children}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderColor: colors.neonPrimary,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: colors.neonPrimary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 2,
  },
  text: {
    color: colors.text,
    fontWeight: '600',
  },
});

export default NeonButton;
