import React, { useState } from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainTabs } from "./MainTabs";
import { AuthScreen } from "@/screens/AuthScreen";
import { TrackScreen } from "@/screens/TrackScreen";
import { ArtistScreen } from "@/screens/ArtistScreen";
import { AlbumScreen } from "@/screens/AlbumScreen";
import { PlaylistScreen } from "@/screens/PlaylistScreen";
import { ChartsScreen } from "@/screens/ChartsScreen";
import { MiniPlayer } from "@/components/MiniPlayer";
import { FullscreenPlayer } from "@/components/FullscreenPlayer";
import { NetworkPill } from "@/components/NetworkPill";
import { colors } from "@/lib/theme";
import { usePlayer } from "@/player/usePlayer";

const Stack = createNativeStackNavigator();

export const RootNavigator: React.FC = () => {
  const [playerOpen, setPlayerOpen] = useState(false);
  const { current } = usePlayer();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Auth" component={AuthScreen} options={{ title: "Sign in" }} />
          <Stack.Screen name="Track" component={TrackScreen} options={{ title: "Track" }} />
          <Stack.Screen name="Artist" component={ArtistScreen} options={{ title: "Artist" }} />
          <Stack.Screen name="Album" component={AlbumScreen} options={{ title: "Album" }} />
          <Stack.Screen
            name="Playlist"
            component={PlaylistScreen}
            options={{ title: "Playlist" }}
          />
          <Stack.Screen name="Charts" component={ChartsScreen} options={{ title: "Charts" }} />
        </Stack.Navigator>
      </NavigationContainer>
      {current && <MiniPlayer onPress={() => setPlayerOpen(true)} />}
      <FullscreenPlayer visible={playerOpen} onClose={() => setPlayerOpen(false)} />
      <NetworkPill />
    </View>
  );
};