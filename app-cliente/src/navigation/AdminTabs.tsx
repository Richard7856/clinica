import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { KpiDashboardScreen } from "@/screens/admin/KpiDashboardScreen";
import { PromotionsAdminScreen } from "@/screens/admin/PromotionsAdminScreen";
import { DevicesAdminScreen } from "@/screens/admin/DevicesAdminScreen";
import { AppointmentsAdminScreen } from "@/screens/admin/AppointmentsAdminScreen";
import { RewardsAdminScreen } from "@/screens/admin/RewardsAdminScreen";
import { StoreAdminScreen } from "@/screens/admin/StoreAdminScreen";
import { ClinicsAdminScreen } from "@/screens/admin/ClinicsAdminScreen";
import { PointsConfigScreen } from "@/screens/admin/PointsConfigScreen";
import { UsersAdminScreen } from "@/screens/admin/UsersAdminScreen";
import { AjustesMenuScreen } from "@/screens/admin/AjustesMenuScreen";
import { TabIcon, type TabName } from "@/components/TabIcon";
import { AdminTopBar } from "@/components/AdminTopBar";
import { colors } from "@/theme";

// El tab "Ajustes" agrupa configuración y gestión en un stack.
export type AjustesStackParams = {
  AjustesMenu: undefined;
  Aparatos: undefined;
  Recompensas: undefined;
  Clinicas: undefined;
  Usuarios: undefined;
  ConfigPuntos: undefined;
};

const Tab = createBottomTabNavigator();
const AjustesStack = createNativeStackNavigator<AjustesStackParams>();

function AjustesNavigator() {
  return (
    <AjustesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.ground },
        headerTintColor: colors.cream,
        headerTitleStyle: { fontWeight: "300" },
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <AjustesStack.Screen name="AjustesMenu" component={AjustesMenuScreen} options={{ headerShown: false }} />
      <AjustesStack.Screen name="Aparatos" component={DevicesAdminScreen} options={{ title: "Aparatos" }} />
      <AjustesStack.Screen name="Recompensas" component={RewardsAdminScreen} options={{ title: "Recompensas" }} />
      <AjustesStack.Screen name="Clinicas" component={ClinicsAdminScreen} options={{ title: "Clínicas" }} />
      <AjustesStack.Screen name="Usuarios" component={UsersAdminScreen} options={{ title: "Usuarios" }} />
      <AjustesStack.Screen name="ConfigPuntos" component={PointsConfigScreen} options={{ title: "Config. de puntos" }} />
    </AjustesStack.Navigator>
  );
}

const ICONS: Record<string, TabName> = {
  Inicio: "inicio",
  Promociones: "promos",
  Tienda: "comprar",
  Citas: "citas",
  Ajustes: "recompensas",
};

export function AdminTabs() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.ground }}>
      <AdminTopBar />
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
        <Tab.Screen name="Inicio" component={KpiDashboardScreen} />
        <Tab.Screen name="Promociones" component={PromotionsAdminScreen} />
        <Tab.Screen name="Tienda" component={StoreAdminScreen} />
        <Tab.Screen name="Citas" component={AppointmentsAdminScreen} />
        <Tab.Screen name="Ajustes" component={AjustesNavigator} />
      </Tab.Navigator>
    </View>
  );
}
