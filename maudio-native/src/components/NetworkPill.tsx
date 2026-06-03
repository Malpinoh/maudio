import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wifi, WifiOff } from "lucide-react-native";
import { useNetwork } from "@/hooks/useNetwork";
import { colors } from "@/lib/theme";

export const NetworkPill: React.FC = () => {
  const { transition } = useNetwork();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!transition) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
    ]).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }).start();
    }, 1500);
    return () => clearTimeout(t);
  }, [transition]);

  if (!transition) return null;
  const isOnline = transition === "online";

  return (
    <SafeAreaView pointerEvents="none" style={styles.safe} edges={["top"]}>
      <Animated.View
        style={[
          styles.pill,
          {
            opacity,
            transform: [{ scale }],
            backgroundColor: isOnline ? colors.success : colors.danger,
          },
        ]}
      >
        {isOnline ? (
          <Wifi color={colors.text} size={18} />
        ) : (
          <WifiOff color={colors.text} size={18} />
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { position: "absolute", top: 0, right: 0, zIndex: 100 },
  pill: {
    margin: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});