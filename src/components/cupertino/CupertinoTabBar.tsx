import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '../design/theme';

type Tab = { key: string; title: string };

type Props = {
  tabs: Tab[];
  activeKey?: string;
  onPress?: (key: string) => void;
};

const CupertinoTabBar: React.FC<Props> = ({ tabs, activeKey, onPress }) => {
  return (
    <View style={styles.container}>
      {tabs.map(t => (
        <TouchableOpacity key={t.key} onPress={() => onPress && onPress(t.key)} style={[styles.tab, activeKey === t.key && styles.active]}>
          <Text style={[styles.text, activeKey === t.key && styles.textActive]}>{t.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 8,
    borderTopLeftRadius: theme.ios.cornerRadius,
    borderTopRightRadius: theme.ios.cornerRadius,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  active: {
    backgroundColor: theme.ios.iosPrimary,
  },
  text: {
    color: theme.colors.text,
    fontFamily: theme.ios.fontFamilyNative as any,
  },
  textActive: {
    color: '#fff',
    fontWeight: '700',
  }
});

export default CupertinoTabBar;
