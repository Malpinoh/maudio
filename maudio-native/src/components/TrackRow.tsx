import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Play, Pause } from "lucide-react-native";
import { colors, radius } from "@/lib/theme";
import { coverUrl } from "@/lib/supabase";
import { usePlayer } from "@/player/usePlayer";

type Props = { track: any; rank?: number; queue?: any[] };

export const TrackRow: React.FC<Props> = ({ track, rank, queue }) => {
  const { playTrack, togglePlay, current, isPlaying } = usePlayer();
  const isCurrent = current?.id === track.id;
  const onPress = () => (isCurrent ? togglePlay() : playTrack(track, queue));
  const cover = coverUrl(track.cover_art_path);
  return (
    <Pressable onPress={onPress} style={styles.row}>
      {rank !== undefined && <Text style={styles.rank}>{rank}</Text>}
      <Image source={{ uri: cover || undefined }} style={styles.cover} />
      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.title, isCurrent && { color: colors.primary }]}>
          {track.title}
        </Text>
        <Text numberOfLines={1} style={styles.artist}>
          {track.artist}
        </Text>
      </View>
      {isCurrent && isPlaying ? (
        <Pause size={18} color={colors.text} />
      ) : (
        <Play size={18} color={colors.muted} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  rank: { width: 24, textAlign: "center", color: colors.muted, fontWeight: "700" },
  cover: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.surface },
  body: { flex: 1 },
  title: { color: colors.text, fontWeight: "600", fontSize: 14 },
  artist: { color: colors.muted, fontSize: 12, marginTop: 2 },
});