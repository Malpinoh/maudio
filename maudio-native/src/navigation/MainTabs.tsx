import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, Search, Library, User } from "lucide-react-native";
import { HomeScreen } from "@/screens/HomeScreen";
import { SearchScreen } from "@/screens/SearchScreen";
import { LibraryScreen } from "@/screens/LibraryScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { colors } from "@/lib/theme";

const Tab = createBottomTabNavigator();

export const MainTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      tabBarStyle: {
        backgroundColor: colors.bgElevated,
        borderTopColor: colors.border,
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      tabBarIcon: ({ color, size }) => {
        const Icon =
          route.name === "Home"
            ? Home
            : route.name === "Search"
            ? Search
            : route.name === "Library"
            ? Library
            : User;
        return <Icon color={color} size={size} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
    <Tab.Screen name="Search" component={SearchScreen} />
    <Tab.Screen name="Library" component={LibraryScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);