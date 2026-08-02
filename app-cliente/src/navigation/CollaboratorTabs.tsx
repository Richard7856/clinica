import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CollabHomeScreen } from "@/screens/collab/CollabHomeScreen";
import { ScannerScreen } from "@/screens/collab/ScannerScreen";
import { TabIcon, type TabName } from "@/components/TabIcon";
import { AdminTopBar } from "@/components/AdminTopBar";
import { colors } from "@/theme";

const Tab = createBottomTabNavigator();

const ICONS: Record<string, TabName> = {
  Inicio: "inicio",
  Escanear: "escanear",
};

export function CollaboratorTabs() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.ground }}>
      <AdminTopBar roleLabel="Colaborador" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name={ICONS[route.name]} color={color} />,
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
        <Tab.Screen name="Inicio" component={CollabHomeScreen} />
        <Tab.Screen name="Escanear" component={ScannerScreen} />
      </Tab.Navigator>
    </View>
  );
}
