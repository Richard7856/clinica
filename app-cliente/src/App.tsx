import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LoginScreen } from "@/screens/LoginScreen";
import { Tabs } from "@/navigation/Tabs";
import { AdminTabs } from "@/navigation/AdminTabs";
import { colors } from "@/theme";

// Decide entre login, panel de cliente y panel de admin según el rol.
function Root() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (!user) return <LoginScreen />;
  return role === "admin" ? <AdminTabs /> : <Tabs />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <Root />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
});
