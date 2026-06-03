import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors, radius } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";

export const ProfileScreen: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const nav = useNavigation<any>();

  if (!user) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Not signed in</Text>
        <Pressable style={styles.btn} onPress={() => nav.navigate("Auth")}>
          <Text style={styles.btnText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{profile?.full_name || profile?.username || user.email}</Text>
      <Text style={styles.sub}>{user.email}</Text>
      <Text style={styles.sub}>Role: {profile?.role || "user"}</Text>
      <Pressable style={[styles.btn, { backgroundColor: colors.danger }]} onPress={signOut}>
        <Text style={styles.btnText}>Sign out</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 24, gap: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: "700" },
  sub: { color: colors.muted },
  btn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
  },
  btnText: { color: colors.primaryFg, fontWeight: "700" },
});