import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

const FadeIn: React.FC<any> = ({ children, style }) => (
  <Animated.View entering={FadeInDown.duration(450)} style={style}>
    {children}
  </Animated.View>
);

export default FadeIn;
