import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from './theme';

const GlowingPin: React.FC<any> = ({ size = 18 }) => (
  <View style={[styles.outer, { width: size * 2, height: size * 2, borderRadius: size } ]}> 
    <View style={[styles.inner, { width: size, height: size, borderRadius: size / 2 }]} />
  </View>
);

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,255,213,0.06)',
    shadowColor: colors.neonPrimary,
    shadowOpacity: 0.9,
    shadowRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,255,213,0.28)'
  },
  inner: {
    backgroundColor: colors.neonPrimary,
    elevation: 6,
    width: '70%',
    height: '70%'
  }
});

export default GlowingPin;
