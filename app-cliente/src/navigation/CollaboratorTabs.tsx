import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CollabHomeScreen } from "@/screens/collab/CollabHomeScreen";
import { ScannerScreen } from "@/screens/collab/ScannerScreen";
import { CollabAppointmentsScreen } from "@/screens/collab/CollabAppointmentsScreen";
import { CollabVisitScreen } from "@/screens/collab/CollabVisitScreen";
import { TabIcon, type TabName } from "@/components/TabIcon";
import { AdminTopBar } from "@/components/AdminTopBar";
import { colors } from "@/theme";
import type { TodayVisit } from "@/lib/collaborator";

// El tab "Citas" es un stack: lista de citas del día → detalle de la visita.
export type CitasStackParams = {
  CitasList: undefined;
  VisitDetail: { visit: TodayVisit };
};

const Tab = createBottomTabNavigator();
const CitasStack = createNativeStackNavigator<CitasStackParams>();

function CitasNavigator() {
  return (
    <CitasStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.ground },
        headerTintColor: colors.cream,
        headerTitleStyle: { fontWeight: "300" },
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <CitasStack.Screen name="CitasList" component={CollabAppointmentsScreen} options={{ headerShown: false }} />
      <CitasStack.Screen name="VisitDetail" component={CollabVisitScreen} options={{ title: "Visita" }} />
    </CitasStack.Navigator>
  );
}

const ICONS: Record<string, TabName> = {
  Inicio: "inicio",
  Citas: "citas",
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
        <Tab.Screen name="Citas" component={CitasNavigator} />
        <Tab.Screen name="Escanear" component={ScannerScreen} />
      </Tab.Navigator>
    </View>
  );
}
