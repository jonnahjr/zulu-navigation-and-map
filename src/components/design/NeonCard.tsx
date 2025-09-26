import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from './theme';
import BlurFallback from './BlurFallback';

const NeonCard: React.FC<any> = ({ children, style, useBlur = false }) => {
  if (useBlur) {
    return <BlurFallback style={[styles.card, style]}>{children}</BlurFallback>;
  }
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: spacing.md,
    boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: colors.outline,
    overflow: 'hidden',
  },
});

export default NeonCard;
