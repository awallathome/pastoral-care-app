import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, typography } from "../theme/theme";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { StatusBadge } from "../components/Badge";
import { ContactMethodPicker } from "../components/ContactMethodPicker";
import { DateTimeField } from "../components/DateTimeField";
import { TextField } from "../components/TextField";
import { api, ApiError } from "../api/client";
import { ContactMethod, PersonDetail, Visit } from "../types";
import { RootStackParamList } from "../navigation/types";
import { formatDateTime } from "../lib/dates";
import { useAuth, canSeeNotes } from "../auth/AuthContext";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, "VisitDetail">;

export function VisitDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { params } = useRoute<Rt>();

  const [visit, setVisit] = useState<Visit | null>(null);
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [contactMethod, setContactMethod] = useState<ContactMethod | null>(null);
  const [notes, setNotes] = useState("");
  const [alternateContactId, setAlternateContactId] = useState<string | undefined>(undefined);
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextVisitDate, setNextVisitDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const v = await api.get<Visit>(`/visits/${params.visitId}`);
      setVisit(v);
      setContactMethod(v.contactMethod);
      setNotes(v.notes || "");
      setAlternateContactId(v.alternateContactId || undefined);
      setRescheduleDate(new Date(v.scheduledFor));
      if (v.personId) {
        const p = await api.get<PersonDetail>(`/people/${v.personId}`);
        setPerson(p);
      }
    } catch {
      setError("Couldn't load this visit.");
    } finally {
      setLoading(false);
    }
  }, [params.visitId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const logVisit = async () => {
    if (!visit || !contactMethod) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/visits/${visit.id}/complete`, {
        contactMethod,
        notes: notes.trim() || undefined,
        nextVisitScheduledFor: scheduleNext ? nextVisitDate.toISOString() : undefined,
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save this visit.");
    } finally {
      setSaving(false);
    }
  };

  const saveReschedule = async () => {
    if (!visit) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/visits/${visit.id}`, {
        scheduledFor: rescheduleDate.toISOString(),
        status: "RESCHEDULED",
      });
      setRescheduling(false);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't reschedule this visit.");
    } finally {
      setSaving(false);
    }
  };

  const cancelVisit = () => {
    if (!visit) return;
    Alert.alert("Cancel this visit?", "This can't be undone, but you can always schedule a new one.", [
      { text: "Never mind", style: "cancel" },
      {
        text: "Cancel visit",
        style: "destructive",
        onPress: async () => {
          try {
            await api.patch(`/visits/${visit.id}`, { status: "CANCELED" });
            navigation.goBack();
          } catch {
            setError("Couldn't cancel this visit.");
          }
        },
      },
    ]);
  };

  if (loading || !visit) {
    return <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.accent} />;
  }

  const name = visit.person ? `${visit.person.firstName} ${visit.person.lastName}` : "Parishioner";
  const isActive = visit.status === "SCHEDULED" || visit.status === "RESCHEDULED";
  const userCanLogNotes = canSeeNotes(user);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.navigate("PersonDetail", { personId: visit.personId })}>
        <Text style={styles.name}>{name}</Text>
      </Pressable>
      <View style={styles.metaRow}>
        <Text style={typography.caption}>{formatDateTime(visit.scheduledFor)}</Text>
        <StatusBadge status={visit.status} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {isActive && (
        <Card style={styles.card}>
          <Text style={typography.sectionTitle}>Schedule</Text>
          {!rescheduling ? (
            <View style={styles.scheduleActions}>
              <PrimaryButton title="Reschedule" variant="secondary" onPress={() => setRescheduling(true)} />
              <PrimaryButton title="Cancel visit" variant="danger" onPress={cancelVisit} />
            </View>
          ) : (
            <>
              <DateTimeField label="New date & time" value={rescheduleDate} onChange={setRescheduleDate} />
              <View style={styles.scheduleActions}>
                <PrimaryButton title="Save new time" onPress={saveReschedule} loading={saving} />
                <PrimaryButton title="Never mind" variant="secondary" onPress={() => setRescheduling(false)} />
              </View>
            </>
          )}
        </Card>
      )}

      {person && person.emergencyContacts.length > 0 && (
        <Card style={styles.card}>
          <Text style={typography.sectionTitle}>Point of contact for this visit</Text>
          <View style={styles.chipsRow}>
            <Pressable
              style={[styles.altChip, !alternateContactId && styles.altChipSelected]}
              onPress={() => setAlternateContactId(undefined)}
            >
              <Text style={[styles.altChipText, !alternateContactId && styles.altChipTextSelected]}>
                {name.split(" ")[0]} directly
              </Text>
            </Pressable>
            {person.emergencyContacts.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.altChip, alternateContactId === c.id && styles.altChipSelected]}
                onPress={() => setAlternateContactId(c.id)}
              >
                <Text style={[styles.altChipText, alternateContactId === c.id && styles.altChipTextSelected]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      )}

      {isActive && userCanLogNotes && (
        <Card style={styles.card}>
          <ContactMethodPicker value={contactMethod} onChange={setContactMethod} />

          <View style={{ marginTop: spacing.md }}>
            <TextField
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="What came up, how they're doing, anything to follow up on..."
            />
          </View>

          <Pressable style={styles.toggleRow} onPress={() => setScheduleNext((s) => !s)}>
            <View style={[styles.checkbox, scheduleNext && styles.checkboxChecked]} />
            <Text style={typography.body}>Schedule the next visit now</Text>
          </Pressable>
          {scheduleNext && (
            <DateTimeField label="Next visit" value={nextVisitDate} onChange={setNextVisitDate} />
          )}

          <PrimaryButton
            title="Log this visit"
            onPress={logVisit}
            loading={saving}
            disabled={!contactMethod}
            style={{ marginTop: spacing.sm }}
          />
        </Card>
      )}

      {isActive && !userCanLogNotes && (
        <Card style={styles.card}>
          <Text style={typography.caption}>
            Logging how contact was made and any notes is limited to ministers.
          </Text>
        </Card>
      )}

      {!isActive && (
        <Card style={styles.card}>
          <Text style={typography.sectionTitle}>How it went</Text>
          {visit.contactMethod && <Text style={typography.body}>Contact: {visit.contactMethod}</Text>}
          {visit.notesRestricted ? (
            <Text style={styles.restricted}>Notes hidden — ask a minister</Text>
          ) : visit.notes ? (
            <Text style={typography.body}>{visit.notes}</Text>
          ) : (
            <Text style={typography.caption}>No notes recorded.</Text>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  name: { ...typography.title, color: colors.accent },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 4, marginBottom: spacing.sm },
  card: { marginTop: spacing.md, gap: spacing.xs },
  error: { color: colors.danger },
  scheduleActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  altChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  altChipSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  altChipText: { color: colors.textPrimary },
  altChipTextSelected: { color: colors.accent, fontWeight: "600" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.xs },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: colors.border },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  restricted: { color: colors.textMuted, fontStyle: "italic" },
});
