import React from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { BiometricGate } from "./src/auth/BiometricGate";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { colors } from "./src/theme/theme";

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <BiometricGate>
      <RootNavigator />
    </BiometricGate>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
