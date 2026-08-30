import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "@/screens/HomeScreen";
import { QrScreen } from "@/screens/QrScreen";
import { PromosScreen } from "@/screens/PromosScreen";
import { RewardsScreen } from "@/screens/RewardsScreen";
import { CitaScreen } from "@/screens/CitaScreen";
import { StoreScreen } from "@/screens/StoreScreen";
import { LocationScreen } from "@/screens/LocationScreen";
import { TabIcon, type TabName } from "@/components/TabIcon";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/auth";
import { colors } from "@/theme";

// Inicio es un stack, no una pantalla suelta: desde ahí se abre el QR a
// pantalla completa y el listado de promociones sin salir del tab.
export type HomeStackParams = {
  Inicio: undefined;
  MiQr: {
    appointmentId: string;
    titulo: string;
    cuando: string;
    sucursal?: string;
  };
  Promos: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParams>();

function InicioStack() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Inicio" component={HomeScreen} />
      <HomeStack.Screen name="MiQr" component={QrScreen} />
      <HomeStack.Screen name="Promos" component={PromosScreen} />
    </HomeStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

const ICONS: Record<string, TabName> = {
  Inicio: "inicio",
  Recompensas: "recompensas",
  Cita: "citas",
  Tienda: "comprar",
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
        <Tab.Screen name="Inicio" component={InicioStack} />
        <Tab.Screen
          name="Recompensas"
          component={RewardsScreen}
          options={{ tabBarLabel: "Cisnes" }}
        />
        <Tab.Screen name="Cita" component={CitaScreen} />
        <Tab.Screen name="Tienda" component={StoreScreen} />
        <Tab.Screen name="Ubicación" component={LocationScreen} />
      </Tab.Navigator>
    </View>
  );
}
