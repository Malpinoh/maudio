import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/lib/theme";
import { coverUrl } from "@/lib/supabase";
import { usePlayer } from "@/player/usePlayer";

export const AlbumCard: React.FC<{ track: any }> = ({ track }) => {
  const { playTrack } = usePlayer();
  const cover = coverUrl(track.cover_art_path);
  return (
    <Pressable onPress={() => playTrack(track)} style={styles.card}>
      <Image source={{ uri: cover || undefined }} style={styles.cover} />
      <Text numberOfLines={1} style={styles.title}>
        {track.album_name || track.title}
      </Text>
      <Text numberOfLines={1} style={styles.artist}>
        {track.artist}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: { width: 140, marginRight: 12 },
  cover: {
    width: 140,
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  title: { color: colors.text, fontSize: 13, fontWeight: "600" },
  artist: { color: colors.muted, fontSize: 12, marginTop: 2 },
});