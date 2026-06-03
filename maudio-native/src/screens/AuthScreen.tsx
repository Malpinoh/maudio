import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors, radius } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";

export const AuthScreen: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const nav = useNavigation<any>();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    try {
      setBusy(true);
      if (mode === "in") await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
      nav.goBack();
    } catch (e: any) {
      Alert.alert("Auth error", e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{mode === "in" ? "Welcome back" : "Create account"}</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable disabled={busy} style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>{busy ? "…" : mode === "in" ? "Sign in" : "Sign up"}</Text>
      </Pressable>
      <Pressable onPress={() => setMode(mode === "in" ? "up" : "in")}>
        <Text style={styles.toggle}>
          {mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 24, gap: 12 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: 12 },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: radius.md,
  },
  btn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
  },
  btnText: { color: colors.primaryFg, fontWeight: "700" },
  toggle: { color: colors.primary, textAlign: "center", marginTop: 16 },
});