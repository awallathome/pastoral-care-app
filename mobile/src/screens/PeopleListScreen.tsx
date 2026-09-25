import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, radii, spacing, typography } from "../theme/theme";
import { api } from "../api/client";
import { PersonSummary } from "../types";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../auth/AuthContext";
import { formatDate } from "../lib/dates";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function PeopleListScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Ministers default to their own caseload; admin/support see the full
  // roster so they can add and update contact info for anyone in care.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const path = user?.role === "MINISTER" ? "/people?mine=true" : "/people";
      const data = await api.get<PersonSummary[]>(path);
      setPeople(data);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q));
  }, [people, query]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={typography.title}>Parishioners</Text>
        <Pressable onPress={() => navigation.navigate("AddPerson")} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ New</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search by name"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.accent} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={typography.caption}>No one matches "{query}".</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate("PersonDetail", { personId: item.id })}
            >
              <View style={styles.rowMain}>
                <Text style={typography.bodyStrong}>
                  {item.firstName} {item.lastName}
                </Text>
                {item.notesFlag && <Text style={styles.flag}>{item.notesFlag}</Text>}
                {item.address && (
                  <Text style={typography.caption} numberOfLines={1}>
                    {item.address}
                  </Text>
                )}
              </View>
              <Text style={styles.lastVisit} numberOfLines={2}>
                {item.lastVisitAt ? formatDate(item.lastVisitAt) : "Not yet visited"}
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  addButtonText: { color: "#fff", fontWeight: "600" },
  search: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  rowMain: { flex: 1, minWidth: 0 },
  lastVisit: {
    ...typography.caption,
    textAlign: "right",
    maxWidth: 110,
    flexShrink: 0,
  },
  flag: { color: colors.statusFlag, fontSize: 13, fontWeight: "700", textTransform: "uppercase", marginTop: 2 },
});
