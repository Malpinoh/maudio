import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";

export const TrackScreen: React.FC = () => (
  <View style={styles.wrap}>
    <Text style={styles.text}>Track detail — coming soon</Text>
  </View>
);
const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  text: { color: colors.muted },
});