import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";

export const LibraryScreen: React.FC = () => {
  const { user } = useAuth();
  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 96 }}>
      <SectionHeader title="Your Library" />
      {!user ? (
        <Text style={styles.empty}>Sign in to see your saved music and downloads.</Text>
      ) : (
        <View style={{ padding: 16 }}>
          <Text style={styles.empty}>
            Saved tracks, downloads and Offline Mix coming in the next round.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  empty: { color: colors.muted, padding: 16 },
});