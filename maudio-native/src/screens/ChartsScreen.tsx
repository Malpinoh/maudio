import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/lib/theme";
import { useChartTracks } from "@/hooks/useTracks";
import { TrackRow } from "@/components/TrackRow";

export const ChartsScreen: React.FC = () => {
  const [scope, setScope] = useState<"global" | "regional">("global");
  const { tracks, loading } = useChartTracks(scope, undefined, 100);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.toggles}>
        {(["global", "regional"] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setScope(s)}
            style={[styles.chip, scope === s && styles.chipActive]}
          >
            <Text style={[styles.chipText, scope === s && { color: colors.primaryFg }]}>
              {s === "global" ? "Global" : "Regional"}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }}>
        {loading ? (
          <Text style={{ color: colors.muted, padding: 16 }}>Loading…</Text>
        ) : (
          tracks.map((t, i) => <TrackRow key={t.id} track={t} rank={i + 1} queue={tracks} />)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  toggles: { flexDirection: "row", gap: 8, padding: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600" },
});