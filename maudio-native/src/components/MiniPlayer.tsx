import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Play, Pause, SkipForward } from "lucide-react-native";
import { colors, radius } from "@/lib/theme";
import { usePlayer } from "@/player/usePlayer";

export const MiniPlayer: React.FC<{ onPress?: () => void }> = ({ onPress }) => {
  const { current, isPlaying, togglePlay, next } = usePlayer();
  if (!current) return null;
  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <Image source={{ uri: current.artwork as string }} style={styles.cover} />
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>
          {current.title}
        </Text>
        <Text numberOfLines={1} style={styles.artist}>
          {current.artist}
        </Text>
      </View>
      <Pressable onPress={togglePlay} hitSlop={10} style={styles.btn}>
        {isPlaying ? <Pause color={colors.text} size={22} /> : <Play color={colors.text} size={22} />}
      </Pressable>
      <Pressable onPress={next} hitSlop={10} style={styles.btn}>
        <SkipForward color={colors.text} size={20} />
      </Pressable>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 58,
    paddingHorizontal: 8,
    backgroundColor: colors.bgElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 8,
  },
  cover: { width: 42, height: 42, borderRadius: radius.sm, backgroundColor: colors.surface },
  body: { flex: 1 },
  title: { color: colors.text, fontWeight: "600", fontSize: 13 },
  artist: { color: colors.muted, fontSize: 11, marginTop: 2 },
  btn: { padding: 8 },
});