import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, typography } from "../theme/theme";
import { DayAccordion } from "../components/DayAccordion";
import { VisitRow } from "../components/VisitRow";
import { api } from "../api/client";
import { Visit } from "../types";
import { addDays, endOfPreviousDay, isSameDay, startOfDay, weekFrom } from "../lib/dates";
import { openRoute } from "../lib/directions";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../auth/AuthContext";

// Today lives inside the bottom tab navigator, but visits/people details are
// screens on the parent stack — this type lets us navigate to either.
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TodayScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<"week" | "needsAttention">("week");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [unloggedVisits, setUnloggedVisits] = useState<Visit[]>([]);
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
      // Past visits still SCHEDULED/RESCHEDULED never got logged or moved —
      // surface those separately so they don't just silently fall off the
      // bottom of last week's accordion.
      const unloggedTo = endOfPreviousDay(new Date()).toISOString();
      const [data, unlogged] = await Promise.all([
        api.get<Visit[]>(`/visits?from=${from}&to=${to}&mine=true`),
        api.get<Visit[]>(`/visits?to=${unloggedTo}&status=SCHEDULED,RESCHEDULED&mine=true`),
      ]);
      setVisits(data);
      setUnloggedVisits(unlogged);
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

  // Today's addresses, in schedule order — feeds the multi-stop "Route"
  // button. Visits without an address (or without one on file) are
  // skipped rather than breaking the route.
  const todaysAddresses = visitsByDay(startOfDay(new Date()))
    .map((v) => v.person?.address)
    .filter((a): a is string => !!a);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={typography.title}>Schedule</Text>
          <Text style={typography.caption}>{user?.name}</Text>
        </View>
        <View style={styles.headerButtons}>
          {tab === "week" && todaysAddresses.length > 0 && (
            <Pressable onPress={() => openRoute(todaysAddresses)} style={styles.routeButton}>
              <Text style={styles.routeButtonText}>Route</Text>
            </Pressable>
          )}
          <Pressable onPress={() => navigation.navigate("AddVisit", {})} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, tab === "week" && styles.tabActive]}
          onPress={() => setTab("week")}
        >
          <Text style={[styles.tabText, tab === "week" && styles.tabTextActive]}>This week</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "needsAttention" && styles.tabActive]}
          onPress={() => setTab("needsAttention")}
        >
          <Text style={[styles.tabText, tab === "needsAttention" && styles.tabTextActive]}>
            Needs attention{unloggedVisits.length > 0 ? ` (${unloggedVisits.length})` : ""}
          </Text>
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
          {tab === "week" ? (
            days.map((day) => (
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
            ))
          ) : unloggedVisits.length === 0 ? (
            <Text style={[typography.caption, styles.empty]}>
              Nothing to catch up on — every past visit has been logged or rescheduled.
            </Text>
          ) : (
            <>
              <Text style={[typography.caption, styles.empty]}>
                From prior days, still marked scheduled. Log what happened, or reschedule.
              </Text>
              {unloggedVisits.map((v) => (
                <VisitRow
                  key={v.id}
                  visit={v}
                  showDate
                  onPress={() => navigation.navigate("VisitDetail", { visitId: v.id })}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}

      <Pressable onPress={logout} style={styles.logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </SafeAreaView>
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
  headerButtons: { flexDirection: "row", gap: spacing.sm },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  addButtonText: { color: "#fff", fontWeight: "600" },
  routeButton: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  routeButtonText: { color: colors.accent, fontWeight: "600" },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: 16, alignItems: "center" },
  tabActive: { backgroundColor: colors.accentSoft },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.accent },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  error: { color: colors.danger, marginBottom: spacing.md, paddingHorizontal: spacing.sm },
  empty: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  logout: { padding: spacing.md, alignItems: "center" },
  logoutText: { color: colors.textMuted, fontSize: 13 },
});
