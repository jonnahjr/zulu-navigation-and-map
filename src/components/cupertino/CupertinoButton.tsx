import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ComponentProps } from 'react';
type ViewStyleAny = any;
type TextStyleAny = any;
type GestureEventAny = any;
import theme from '../design/theme';

type Props = {
  title: string;
  onPress?: (e: GestureEventAny) => void;
  style?: ViewStyleAny;
  textStyle?: TextStyleAny;
  variant?: 'default' | 'primary' | 'ghost';
};

const CupertinoButton: React.FC<Props> = ({ title, onPress, style, textStyle, variant = 'default' }) => {
  const bg = variant === 'primary' ? theme.ios.iosPrimary : 'rgba(255,255,255,0.06)';
  const color = variant === 'primary' ? '#fff' : theme.colors.text;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.btn, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color }, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.ios.cornerRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontFamily: theme.ios.fontFamilyNative as any,
    fontWeight: '600',
  }
});

export default CupertinoButton;
