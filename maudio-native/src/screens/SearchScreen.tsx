import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { colors, radius } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { TrackRow } from "@/components/TrackRow";

export const SearchScreen: React.FC = () => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      const { data } = await supabase
        .from("tracks")
        .select("*")
        .eq("published", true)
        .or(`title.ilike.%${q}%,artist.ilike.%${q}%`)
        .limit(40);
      setResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <View style={styles.wrap}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search songs, artists…"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      <ScrollView>
        {results.map((t) => (
          <TrackRow key={t.id} track={t} queue={results} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  input: {
    margin: 16,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    color: colors.text,
  },
});