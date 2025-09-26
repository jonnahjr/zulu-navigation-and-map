import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import theme from '../design/theme';

type Props = {
  children: React.ReactNode;
  style?: any;
};

const CupertinoLayout: React.FC<Props> = ({ children, style }) => {
  return (
    <SafeAreaView style={[styles.container, style]} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  inner: { flex: 1 }
});

export default CupertinoLayout;
