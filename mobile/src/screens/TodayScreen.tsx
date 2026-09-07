import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, typography } from "../theme/theme";
import { DayAccordion } from "../components/DayAccordion";
import { api } from "../api/client";
import { Visit } from "../types";
import { addDays, isSameDay, startOfDay, weekFrom } from "../lib/dates";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../auth/AuthContext";

// Today lives inside the bottom tab navigator, but visits/people details are
// screens on the parent stack — this type lets us navigate to either.
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TodayScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string>(startOfDay(new Date()).toISOString());

  const days = useMemo(() => weekFrom(), []);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const from = startOfDay(new Date()).toISOString();
      const to = addDays(startOfDay(new Date()), 7).toISOString();
      const data = await api.get<Visit[]>(`/visits?from=${from}&to=${to}&mine=true`);
      setVisits(data);
    } catch {
      setError("Couldn't load your schedule. Pull down to try again.");
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visitsByDay = (day: Date) => visits.filter((v) => isSameDay(new Date(v.scheduledFor), day));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={typography.title}>This week</Text>
          <Text style={typography.caption}>{user?.name}</Text>
        </View>
        <Pressable onPress={() => navigation.navigate("AddVisit", {})} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.accent} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        >
          {error && <Text style={styles.error}>{error}</Text>}
          {days.map((day) => (
            <DayAccordion
              key={day.toISOString()}
              date={day}
              visits={visitsByDay(day)}
              expanded={expandedDay === day.toISOString()}
              onToggle={() =>
                setExpandedDay((current) => (current === day.toISOString() ? "" : day.toISOString()))
              }
              onSelectVisit={(visit) => navigation.navigate("VisitDetail", { visitId: visit.id })}
            />
          ))}
        </ScrollView>
      )}

      <Pressable onPress={logout} style={styles.logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  addButtonText: { color: "#fff", fontWeight: "600" },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  error: { color: colors.danger, marginBottom: spacing.md, paddingHorizontal: spacing.sm },
  logout: { padding: spacing.md, alignItems: "center" },
  logoutText: { color: colors.textMuted, fontSize: 13 },
});
