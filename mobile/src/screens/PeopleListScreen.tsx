import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, radii, spacing, typography } from "../theme/theme";
import { api } from "../api/client";
import { PersonSummary } from "../types";
import { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function PeopleListScreen() {
  const navigation = useNavigation<Nav>();
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<PersonSummary[]>("/people?mine=true");
      setPeople(data);
    } finally {
      setLoading(false);
    }
  }, []);

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
              <View style={{ flex: 1 }}>
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
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  flag: { color: colors.warning, fontSize: 13, fontWeight: "600", marginTop: 2 },
});
