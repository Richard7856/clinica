import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { PromotionsAdminScreen } from "@/screens/admin/PromotionsAdminScreen";
import { DevicesAdminScreen } from "@/screens/admin/DevicesAdminScreen";
import { AppointmentsAdminScreen } from "@/screens/admin/AppointmentsAdminScreen";
import { RewardsAdminScreen } from "@/screens/admin/RewardsAdminScreen";
import { TabIcon, type TabName } from "@/components/TabIcon";
import { AdminTopBar } from "@/components/AdminTopBar";
import { colors } from "@/theme";

const Tab = createBottomTabNavigator();

const ICONS: Record<string, TabName> = {
  Promociones: "promos",
  Aparatos: "aparatos",
  Citas: "citas",
  Recompensas: "recompensas",
};

export function AdminTabs() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.ground }}>
      <AdminTopBar />
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
        <Tab.Screen name="Promociones" component={PromotionsAdminScreen} />
        <Tab.Screen name="Aparatos" component={DevicesAdminScreen} />
        <Tab.Screen name="Citas" component={AppointmentsAdminScreen} />
        <Tab.Screen name="Recompensas" component={RewardsAdminScreen} />
      </Tab.Navigator>
    </View>
  );
}
