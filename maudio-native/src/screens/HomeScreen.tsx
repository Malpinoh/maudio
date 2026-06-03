import React from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";
import { useTracks } from "@/hooks/useTracks";
import { useTopPicks } from "@/hooks/useRecommendations";
import { TrackRow } from "@/components/TrackRow";
import { AlbumCard } from "@/components/AlbumCard";
import { SectionHeader } from "@/components/SectionHeader";

export const HomeScreen: React.FC = () => {
  const { tracks: featured } = useTracks({ limit: 10, orderBy: { column: "uploaded_at", ascending: false } });
  const { tracks: popular } = useTracks({ limit: 8, orderBy: { column: "play_count", ascending: false } });
  const { tracks: picks } = useTopPicks(10);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }}>
        <Text style={styles.brand}>MAUDIO</Text>

        <SectionHeader title="Featured" />
        <FlatList
          horizontal
          data={featured}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => <AlbumCard track={item} />}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          showsHorizontalScrollIndicator={false}
        />

        <SectionHeader title="Your Top Picks" subtitle="Curated for you" />
        <View>
          {picks.map((t) => (
            <TrackRow key={t.id} track={t} queue={picks} />
          ))}
        </View>

        <SectionHeader title="Top Charts" />
        <View>
          {popular.map((t, i) => (
            <TrackRow key={t.id} track={t} rank={i + 1} queue={popular} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  brand: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "800",
    paddingHorizontal: 16,
    paddingTop: 8,
    letterSpacing: 1.5,
  },
});