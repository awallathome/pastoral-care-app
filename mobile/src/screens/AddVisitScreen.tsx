import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { colors, radii, spacing, typography } from "../theme/theme";
import { PrimaryButton } from "../components/PrimaryButton";
import { DateTimeField } from "../components/DateTimeField";
import { api, ApiError } from "../api/client";
import { PersonDetail, PersonSummary } from "../types";
import { RootStackParamList } from "../navigation/types";

type Rt = RouteProp<RootStackParamList, "AddVisit">;

export function AddVisitScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<Rt>();

  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [query, setQuery] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | undefined>(params.personId);
  const [selectedPerson, setSelectedPerson] = useState<PersonDetail | null>(null);
  const [loadingPeople, setLoadingPeople] = useState(!params.personId);

  const [scheduledFor, setScheduledFor] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [alternateContactId, setAlternateContactId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.personId) {
      api
        .get<PersonSummary[]>("/people?mine=true")
        .then(setPeople)
        .finally(() => setLoadingPeople(false));
    }
  }, [params.personId]);

  useEffect(() => {
    if (selectedPersonId) {
      api.get<PersonDetail>(`/people/${selectedPersonId}`).then(setSelectedPerson);
    }
  }, [selectedPersonId]);

  const filteredPeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q));
  }, [people, query]);

  const submit = useCallback(async () => {
    if (!selectedPersonId) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/visits", {
        personId: selectedPersonId,
        scheduledFor: scheduledFor.toISOString(),
        alternateContactId,
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't schedule this visit.");
    } finally {
      setSaving(false);
    }
  }, [selectedPersonId, scheduledFor, alternateContactId, navigation]);

  // Step 1: pick who, if we weren't handed a person already.
  if (!selectedPersonId) {
    return (
      <View style={styles.container}>
        <Text style={[typography.sectionTitle, styles.pickerTitle]}>Who are you scheduling?</Text>
        <TextInput
          style={styles.search}
          placeholder="Search by name"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
        {loadingPeople ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.accent} />
        ) : (
          <FlatList
            data={filteredPeople}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
            renderItem={({ item }) => (
              <Pressable style={styles.personRow} onPress={() => setSelectedPersonId(item.id)}>
                <Text style={typography.bodyStrong}>
                  {item.firstName} {item.lastName}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>
    );
  }

  // Step 2: when / who else should be contacted.
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      {selectedPerson ? (
        <Text style={typography.title}>
          {selectedPerson.firstName} {selectedPerson.lastName}
        </Text>
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}

      <View style={{ marginTop: spacing.lg }}>
        <DateTimeField label="Date & time" value={scheduledFor} onChange={setScheduledFor} />
      </View>

      {selectedPerson && selectedPerson.emergencyContacts.length > 0 && (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={typography.sectionTitle}>Alternate point of contact (optional)</Text>
          <View style={styles.chipsRow}>
            {selectedPerson.emergencyContacts.map((c) => {
              const selected = alternateContactId === c.id;
              return (
                <Pressable
                  key={c.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setAlternateContactId(selected ? undefined : c.id)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton title="Schedule visit" onPress={submit} loading={saving} style={{ marginTop: spacing.lg }} />
      {!params.personId && (
        <PrimaryButton
          title="Choose someone else"
          variant="secondary"
          onPress={() => setSelectedPersonId(undefined)}
          style={{ marginTop: spacing.sm }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  pickerTitle: { padding: spacing.lg, paddingBottom: spacing.sm },
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
  personRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textPrimary },
  chipTextSelected: { color: colors.accent, fontWeight: "600" },
  error: { color: colors.danger, marginTop: spacing.md },
});
