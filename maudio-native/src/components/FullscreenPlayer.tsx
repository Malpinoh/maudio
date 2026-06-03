import React from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, Play, Pause, SkipBack, SkipForward } from "lucide-react-native";
import { colors, radius } from "@/lib/theme";
import { usePlayer } from "@/player/usePlayer";
import { formatTime } from "@/lib/format";

export const FullscreenPlayer: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose,
}) => {
  const { current, isPlaying, togglePlay, next, previous, position, duration, seekTo } =
    usePlayer();
  if (!current) return null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable onPress={onClose} style={styles.close} hitSlop={12}>
          <ChevronDown color={colors.text} size={28} />
        </Pressable>
        <Image source={{ uri: current.artwork as string }} style={styles.art} />
        <Text numberOfLines={1} style={styles.title}>
          {current.title}
        </Text>
        <Text numberOfLines={1} style={styles.artist}>
          {current.artist}
        </Text>
        {/* Slider import is optional — fallback below if not installed */}
        <View style={styles.times}>
          <Text style={styles.time}>{formatTime(position)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
        <View style={styles.controls}>
          <Pressable onPress={previous} hitSlop={12}>
            <SkipBack color={colors.text} size={32} />
          </Pressable>
          <Pressable onPress={togglePlay} style={styles.playBtn}>
            {isPlaying ? (
              <Pause color={colors.primaryFg} size={32} />
            ) : (
              <Play color={colors.primaryFg} size={32} />
            )}
          </Pressable>
          <Pressable onPress={next} hitSlop={12}>
            <SkipForward color={colors.text} size={32} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 60 },
  close: { alignSelf: "flex-start", padding: 4, marginBottom: 16 },
  art: { width: "100%", aspectRatio: 1, borderRadius: radius.lg, backgroundColor: colors.surface },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginTop: 24 },
  artist: { color: colors.muted, fontSize: 15, marginTop: 4 },
  times: { flexDirection: "row", justifyContent: "space-between", marginTop: 32 },
  time: { color: colors.muted, fontSize: 12 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 36,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});