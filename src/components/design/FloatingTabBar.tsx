import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors } from './theme';
import { Ionicons } from '@expo/vector-icons';

const icons: Record<string, string> = {
  Home: 'home',
  Search: 'search',
  Directions: 'navigate',
  Saved: 'bookmark',
  Profile: 'person',
};

const FloatingTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.container}>
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const onPress = () => navigation.navigate(route.name);
        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={styles.btn}>
            <Ionicons name={(icons as any)[route.name] || ('help' as any)} size={20} color={focused ? colors.neonPrimary : colors.muted} />
            <Text style={[styles.label, focused && { color: colors.neonPrimary }]}>{route.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 28,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    shadowColor: colors.neonAccent,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    zIndex: 100,
  },
  btn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  label: { color: colors.text, fontSize: 11, marginTop: 2 },
});

export default FloatingTabBar;
