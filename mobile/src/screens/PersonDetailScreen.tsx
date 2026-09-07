import React, { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, typography } from "../theme/theme";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { StatusBadge } from "../components/Badge";
import { api } from "../api/client";
import { PersonDetail, CONTACT_METHOD_LABELS } from "../types";
import { RootStackParamList } from "../navigation/types";
import { formatDateTime } from "../lib/dates";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, "PersonDetail">;

export function PersonDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<PersonDetail>(`/people/${params.personId}`);
      setPerson(data);
    } finally {
      setLoading(false);
    }
  }, [params.personId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading || !person) {
    return <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.accent} />;
  }

  const upcoming = person.visits.filter((v) => v.status === "SCHEDULED" || v.status === "RESCHEDULED");
  const history = person.visits.filter((v) => v.status === "COMPLETED" || v.status === "CANCELED");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={typography.title}>
        {person.firstName} {person.lastName}
      </Text>
      {person.notesFlag && <Text style={styles.flag}>{person.notesFlag}</Text>}

      <Card style={styles.card}>
        <Text style={typography.sectionTitle}>Contact</Text>
        {person.phone && (
          <Pressable onPress={() => Linking.openURL(`tel:${person.phone}`)}>
            <Text style={styles.link}>{person.phone}</Text>
          </Pressable>
        )}
        {person.email && <Text style={typography.body}>{person.email}</Text>}
        {person.address && <Text style={typography.body}>{person.address}</Text>}
        {!person.phone && !person.email && !person.address && (
          <Text style={typography.caption}>No contact info on file yet.</Text>
        )}
      </Card>

      {person.emergencyContacts.length > 0 && (
        <Card style={styles.card}>
          <Text style={typography.sectionTitle}>In case of emergency</Text>
          {person.emergencyContacts.map((c) => (
            <View key={c.id} style={styles.contactRow}>
              <Text style={typography.bodyStrong}>
                {c.name} {c.relationship ? `· ${c.relationship}` : ""}
              </Text>
              <Pressable onPress={() => Linking.openURL(`tel:${c.phone}`)}>
                <Text style={styles.link}>{c.phone}</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      {person.familyMembers.length > 0 && (
        <Card style={styles.card}>
          <Text style={typography.sectionTitle}>Family</Text>
          {person.familyMembers.map((f) => (
            <Text key={f.id} style={typography.body}>
              {f.name} — {f.relationship}
            </Text>
          ))}
          <Text style={[typography.caption, { marginTop: spacing.xs }]}>
            Shown here for context only — open their own file for anything about them.
          </Text>
        </Card>
      )}

      <PrimaryButton
        title="Schedule a visit"
        onPress={() => navigation.navigate("AddVisit", { personId: person.id })}
        style={styles.scheduleButton}
      />

      {upcoming.length > 0 && (
        <View style={styles.section}>
          <Text style={typography.sectionTitle}>Upcoming</Text>
          {upcoming.map((v) => (
            <Pressable
              key={v.id}
              style={styles.visitLine}
              onPress={() => navigation.navigate("VisitDetail", { visitId: v.id })}
            >
              <Text style={typography.body}>{formatDateTime(v.scheduledFor)}</Text>
              <StatusBadge status={v.status} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={typography.sectionTitle}>History</Text>
        {history.length === 0 && <Text style={typography.caption}>No past visits yet.</Text>}
        {history.map((v) => (
          <Pressable
            key={v.id}
            style={styles.historyRow}
            onPress={() => navigation.navigate("VisitDetail", { visitId: v.id })}
          >
            <View style={styles.historyHeader}>
              <Text style={typography.bodyStrong}>{formatDateTime(v.scheduledFor)}</Text>
              <StatusBadge status={v.status} />
            </View>
            {v.contactMethod && (
              <Text style={typography.caption}>{CONTACT_METHOD_LABELS[v.contactMethod]}</Text>
            )}
            {v.notesRestricted ? (
              <Text style={styles.restricted}>Notes hidden — ask a minister</Text>
            ) : v.notes ? (
              <Text style={typography.body} numberOfLines={2}>
                {v.notes}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  flag: { color: colors.warning, fontWeight: "600", marginTop: 2, marginBottom: spacing.sm },
  card: { marginTop: spacing.md, gap: 4 },
  link: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  contactRow: { marginTop: spacing.xs },
  scheduleButton: { marginTop: spacing.lg },
  section: { marginTop: spacing.lg, gap: spacing.xs },
  visitLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  historyRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.xs,
    gap: 4,
  },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  restricted: { color: colors.textMuted, fontStyle: "italic" },
});
