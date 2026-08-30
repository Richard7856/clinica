import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth";
import { UIProvider } from "@/components/ui/UIProvider";
import { LoginScreen } from "@/screens/LoginScreen";
import { Tabs } from "@/navigation/Tabs";
import { AdminTabs } from "@/navigation/AdminTabs";
import { CollaboratorTabs } from "@/navigation/CollaboratorTabs";
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
  if (role === "admin") return <AdminTabs />;
  if (role === "collaborator") return <CollaboratorTabs />;
  return <Tabs />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <UIProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <NavigationContainer>
            <Root />
          </NavigationContainer>
        </AuthProvider>
      </UIProvider>
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
