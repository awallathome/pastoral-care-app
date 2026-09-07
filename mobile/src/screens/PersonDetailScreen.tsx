import React, { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, typography } from "../theme/theme";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { StatusBadge } from "../components/Badge";
import { api } from "../api/client";
import { PersonDetail, TeamUser, CONTACT_METHOD_LABELS } from "../types";
import { RootStackParamList } from "../navigation/types";
import { formatDateTime } from "../lib/dates";
import { openDirections } from "../lib/directions";
import { useAuth } from "../auth/AuthContext";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, "PersonDetail">;

export function PersonDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { user } = useAuth();
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [ministers, setMinisters] = useState<TeamUser[]>([]);
  const [showReassign, setShowReassign] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  const canReassign = user?.role === "ADMIN" || user?.role === "MINISTER";

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

  useFocusEffect(
    useCallback(() => {
      if (!canReassign) return;
      api
        .get<TeamUser[]>("/users?role=MINISTER")
        .then(setMinisters)
        .catch(() => {});
    }, [canReassign])
  );

  const reassign = async (ministerId: string) => {
    if (!person) return;
    setReassigning(true);
    try {
      await api.patch(`/people/${person.id}`, { assignedMinisterId: ministerId });
      setShowReassign(false);
      load();
    } finally {
      setReassigning(false);
    }
  };

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
        {person.address && (
          <View style={styles.addressRow}>
            <Text style={[typography.body, { flex: 1 }]}>{person.address}</Text>
            <Pressable onPress={() => openDirections(person.address!)}>
              <Text style={styles.link}>Directions</Text>
            </Pressable>
          </View>
        )}
        {!person.phone && !person.email && !person.address && (
          <Text style={typography.caption}>No contact info on file yet.</Text>
        )}
      </Card>

      {canReassign && (
        <Card style={styles.card}>
          <View style={styles.reassignHeader}>
            <View>
              <Text style={typography.sectionTitle}>Assigned minister</Text>
              <Text style={typography.body}>
                {person.assignedMinister?.name ?? "Unassigned"}
              </Text>
            </View>
            <Pressable onPress={() => setShowReassign((v) => !v)}>
              <Text style={styles.link}>{showReassign ? "Cancel" : "Change"}</Text>
            </Pressable>
          </View>
          {showReassign && (
            <View style={styles.reassignList}>
              {ministers.length === 0 && (
                <Text style={typography.caption}>No ministers found.</Text>
              )}
              {ministers.map((m) => (
                <Pressable
                  key={m.id}
                  style={styles.reassignRow}
                  disabled={reassigning}
                  onPress={() => reassign(m.id)}
                >
                  <Text
                    style={[
                      typography.body,
                      m.id === person.assignedMinister?.id && styles.reassignCurrent,
                    ]}
                  >
                    {m.name}
                    {m.id === person.assignedMinister?.id ? " (current)" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </Card>
      )}

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
  addressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  reassignHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  reassignList: { marginTop: spacing.sm, gap: spacing.xs },
  reassignRow: { paddingVertical: spacing.xs },
  reassignCurrent: { color: colors.accent, fontWeight: "600" },
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
