import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "@/screens/HomeScreen";
import { RewardsScreen } from "@/screens/RewardsScreen";
import { ShopScreen } from "@/screens/ShopScreen";
import { LocationScreen } from "@/screens/LocationScreen";
import { TabIcon, type TabName } from "@/components/TabIcon";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/auth";
import { colors } from "@/theme";

const Tab = createBottomTabNavigator();

const ICONS: Record<string, TabName> = {
  Inicio: "inicio",
  Recompensas: "recompensas",
  Comprar: "comprar",
  Ubicación: "ubicacion",
};

export function Tabs() {
  const { patient } = useAuth();
  const points = patient?.points ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.ground }}>
      <TopBar points={points} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabIcon name={ICONS[route.name]} color={color} />
          ),
          tabBarActiveTintColor: colors.goldSoft,
          tabBarInactiveTintColor: "#6d6960",
          tabBarStyle: {
            backgroundColor: colors.ground,
            borderTopColor: colors.line,
            borderTopWidth: 1,
            height: 62,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 10, letterSpacing: 0.3 },
        })}
      >
        <Tab.Screen name="Inicio" component={HomeScreen} />
        <Tab.Screen name="Recompensas" component={RewardsScreen} />
        <Tab.Screen name="Comprar" component={ShopScreen} />
        <Tab.Screen name="Ubicación" component={LocationScreen} />
      </Tab.Navigator>
    </View>
  );
}
