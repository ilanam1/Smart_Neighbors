import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';

export default function CustomLoader({
  size = 'small',
  color = '#f97316',
  style,
  animating = true,
  hidesWhenStopped = true,
  ...rest
}) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animating) {
      rotateAnim.setValue(0);
      const animation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();
      return () => animation.stop();
    }
  }, [animating, rotateAnim]);

  if (!animating && hidesWhenStopped) {
    return null;
  }

  // Map 'small' and 'large' to actual numeric sizes
  let numericSize = 48; // default size (fits their 48px spec)
  if (size === 'small') {
    numericSize = 24;
  } else if (size === 'large') {
    numericSize = 48;
  } else if (typeof size === 'number') {
    numericSize = size;
  }

  const borderWidth = Math.max(1.5, numericSize * 0.0625); // ~3px for 48px size
  const innerSize = numericSize - borderWidth * 2 - 2;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, style]} {...rest}>
      <Animated.View
        style={[
          styles.loader,
          {
            width: numericSize,
            height: numericSize,
            borderRadius: numericSize / 2,
            borderWidth: borderWidth,
            transform: [{ rotate: spin }],
          },
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              borderWidth: borderWidth,
              borderBottomColor: color,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  inner: {
    position: 'absolute',
    borderColor: 'transparent',
    boxSizing: 'border-box',
  },
});
