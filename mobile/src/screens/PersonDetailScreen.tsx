import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, typography } from "../theme/theme";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { StatusBadge } from "../components/Badge";
import { api, ApiError } from "../api/client";
import {
  PersonDetail,
  TeamUser,
  EmergencyContact,
  FamilyMember,
  CONTACT_METHOD_LABELS,
} from "../types";
import { RootStackParamList } from "../navigation/types";
import { formatDateTime } from "../lib/dates";
import { openDirections } from "../lib/directions";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, "PersonDetail">;

type EditingRelated =
  | { kind: "emergency"; mode: "add" }
  | { kind: "emergency"; mode: "edit"; id: string }
  | { kind: "family"; mode: "add" }
  | { kind: "family"; mode: "edit"; id: string }
  | null;

export function PersonDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [ministers, setMinisters] = useState<TeamUser[]>([]);
  const [showReassign, setShowReassign] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  // Core parishioner fields: name, status flag, contact.
  const [editingDetails, setEditingDetails] = useState(false);
  const [firstNameDraft, setFirstNameDraft] = useState("");
  const [lastNameDraft, setLastNameDraft] = useState("");
  const [flagDraft, setFlagDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [addressDraft, setAddressDraft] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSaved, setDetailsSaved] = useState(false);

  const [editingRelated, setEditingRelated] = useState<EditingRelated>(null);
  const [relatedName, setRelatedName] = useState("");
  const [relatedRelationship, setRelatedRelationship] = useState("");
  const [relatedPhone, setRelatedPhone] = useState("");
  const [relatedEmail, setRelatedEmail] = useState("");
  const [savingRelated, setSavingRelated] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  const [relatedSaved, setRelatedSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<PersonDetail>(`/people/${params.personId}`);
      setPerson(data);
      return data;
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
      api
        .get<TeamUser[]>("/users?role=MINISTER")
        .then(setMinisters)
        .catch(() => {});
    }, [])
  );

  useEffect(() => {
    if (!detailsSaved) return;
    const t = setTimeout(() => setDetailsSaved(false), 2500);
    return () => clearTimeout(t);
  }, [detailsSaved]);

  useEffect(() => {
    if (!relatedSaved) return;
    const t = setTimeout(() => setRelatedSaved(null), 2500);
    return () => clearTimeout(t);
  }, [relatedSaved]);

  const startEditDetails = () => {
    if (!person) return;
    setFirstNameDraft(person.firstName);
    setLastNameDraft(person.lastName);
    setFlagDraft(person.notesFlag ?? "");
    setPhoneDraft(person.phone ?? "");
    setEmailDraft(person.email ?? "");
    setAddressDraft(person.address ?? "");
    setDetailsError(null);
    setDetailsSaved(false);
    setEditingDetails(true);
  };

  const cancelEditDetails = () => {
    setEditingDetails(false);
    setDetailsError(null);
  };

  const saveDetails = async () => {
    if (!person) return;
    if (!firstNameDraft.trim() || !lastNameDraft.trim()) {
      setDetailsError("First and last name are required.");
      return;
    }
    setDetailsError(null);
    setDetailsSaved(false);
    setSavingDetails(true);
    try {
      const updated = await api.patch<PersonDetail>(`/people/${person.id}`, {
        firstName: firstNameDraft.trim(),
        lastName: lastNameDraft.trim(),
        notesFlag: flagDraft.trim() || null,
        phone: phoneDraft.trim() || null,
        email: emailDraft.trim() || null,
        address: addressDraft.trim() || null,
      });
      setPerson((prev) =>
        prev
          ? {
              ...prev,
              firstName: updated.firstName,
              lastName: updated.lastName,
              notesFlag: updated.notesFlag,
              phone: updated.phone,
              email: updated.email,
              address: updated.address,
            }
          : prev
      );
      setEditingDetails(false);
      setDetailsSaved(true);
    } catch (e) {
      setDetailsError(e instanceof ApiError ? e.message : "Couldn't save details.");
    } finally {
      setSavingDetails(false);
    }
  };

  const startAddEmergency = () => {
    setRelatedName("");
    setRelatedRelationship("");
    setRelatedPhone("");
    setRelatedEmail("");
    setRelatedError(null);
    setEditingRelated({ kind: "emergency", mode: "add" });
  };

  const startEditEmergency = (c: EmergencyContact) => {
    setRelatedName(c.name);
    setRelatedRelationship(c.relationship ?? "");
    setRelatedPhone(c.phone);
    setRelatedEmail(c.email ?? "");
    setRelatedError(null);
    setEditingRelated({ kind: "emergency", mode: "edit", id: c.id });
  };

  const startAddFamily = () => {
    setRelatedName("");
    setRelatedRelationship("");
    setRelatedPhone("");
    setRelatedError(null);
    setEditingRelated({ kind: "family", mode: "add" });
  };

  const startEditFamily = (f: FamilyMember) => {
    setRelatedName(f.name);
    setRelatedRelationship(f.relationship);
    setRelatedPhone(f.phone ?? "");
    setRelatedError(null);
    setEditingRelated({ kind: "family", mode: "edit", id: f.id });
  };

  const cancelRelated = () => {
    setEditingRelated(null);
    setRelatedError(null);
  };

  const saveRelated = async () => {
    if (!person || !editingRelated) return;
    if (!relatedName.trim()) {
      setRelatedError("Name is required.");
      return;
    }
    if (editingRelated.kind === "emergency" && !relatedPhone.trim()) {
      setRelatedError("Phone is required for an emergency contact.");
      return;
    }
    if (editingRelated.kind === "family" && !relatedRelationship.trim()) {
      setRelatedError("Relationship is required.");
      return;
    }

    setSavingRelated(true);
    setRelatedError(null);
    try {
      if (editingRelated.kind === "emergency") {
        const body = {
          name: relatedName.trim(),
          relationship: relatedRelationship.trim() || null,
          phone: relatedPhone.trim(),
          email: relatedEmail.trim() || null,
        };
        if (editingRelated.mode === "add") {
          const created = await api.post<EmergencyContact>(
            `/people/${person.id}/emergency-contacts`,
            body
          );
          setPerson((prev) =>
            prev ? { ...prev, emergencyContacts: [...prev.emergencyContacts, created] } : prev
          );
          setRelatedSaved("Emergency contact saved.");
        } else {
          const updated = await api.patch<EmergencyContact>(
            `/people/${person.id}/emergency-contacts/${editingRelated.id}`,
            body
          );
          setPerson((prev) =>
            prev
              ? {
                  ...prev,
                  emergencyContacts: prev.emergencyContacts.map((c) =>
                    c.id === updated.id ? updated : c
                  ),
                }
              : prev
          );
          setRelatedSaved("Emergency contact updated.");
        }
      } else {
        const body = {
          name: relatedName.trim(),
          relationship: relatedRelationship.trim(),
          phone: relatedPhone.trim() || null,
        };
        if (editingRelated.mode === "add") {
          const created = await api.post<FamilyMember>(`/people/${person.id}/family`, body);
          setPerson((prev) =>
            prev ? { ...prev, familyMembers: [...prev.familyMembers, created] } : prev
          );
          setRelatedSaved("Family member saved.");
        } else {
          const updated = await api.patch<FamilyMember>(
            `/people/${person.id}/family/${editingRelated.id}`,
            body
          );
          setPerson((prev) =>
            prev
              ? {
                  ...prev,
                  familyMembers: prev.familyMembers.map((f) => (f.id === updated.id ? updated : f)),
                }
              : prev
          );
          setRelatedSaved("Family member updated.");
        }
      }
      setEditingRelated(null);
    } catch (e) {
      setRelatedError(e instanceof ApiError ? e.message : "Couldn't save.");
    } finally {
      setSavingRelated(false);
    }
  };

  const removeEmergency = (c: EmergencyContact) => {
    if (!person) return;
    Alert.alert("Remove contact?", `Remove ${c.name} from emergency contacts?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/people/${person.id}/emergency-contacts/${c.id}`);
            setPerson((prev) =>
              prev
                ? {
                    ...prev,
                    emergencyContacts: prev.emergencyContacts.filter((x) => x.id !== c.id),
                  }
                : prev
            );
            setRelatedSaved("Emergency contact removed.");
          } catch (e) {
            Alert.alert("Couldn't remove", e instanceof ApiError ? e.message : "Try again.");
          }
        },
      },
    ]);
  };

  const removeFamily = (f: FamilyMember) => {
    if (!person) return;
    Alert.alert("Remove family member?", `Remove ${f.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/people/${person.id}/family/${f.id}`);
            setPerson((prev) =>
              prev
                ? { ...prev, familyMembers: prev.familyMembers.filter((x) => x.id !== f.id) }
                : prev
            );
            setRelatedSaved("Family member removed.");
          } catch (e) {
            Alert.alert("Couldn't remove", e instanceof ApiError ? e.message : "Try again.");
          }
        },
      },
    ]);
  };

  const reassign = async (ministerId: string) => {
    if (!person) return;
    setReassigning(true);
    try {
      await api.patch(`/people/${person.id}`, { assignedMinisterId: ministerId });
      setShowReassign(false);
      await load();
      setDetailsSaved(true);
    } finally {
      setReassigning(false);
    }
  };

  if (loading || !person) {
    return <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.accent} />;
  }

  const upcoming = person.visits.filter((v) => v.status === "SCHEDULED" || v.status === "RESCHEDULED");
  const history = person.visits.filter((v) => v.status === "COMPLETED" || v.status === "CANCELED");
  const editingEmergency =
    editingRelated?.kind === "emergency" ? editingRelated : null;
  const editingFamily = editingRelated?.kind === "family" ? editingRelated : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!editingDetails ? (
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={typography.title}>
              {person.firstName} {person.lastName}
            </Text>
            {person.notesFlag ? (
              <Text style={styles.flag}>{person.notesFlag}</Text>
            ) : (
              <Text style={styles.flagMuted}>No status flag</Text>
            )}
          </View>
        </View>
      ) : (
        <Text style={typography.sectionTitle}>Editing details</Text>
      )}
      {detailsSaved && !editingDetails && <Text style={styles.savedBanner}>Details saved.</Text>}

      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={typography.sectionTitle}>Details</Text>
          {!editingDetails && (
            <Pressable onPress={startEditDetails} accessibilityRole="button">
              <Text style={styles.link}>Edit</Text>
            </Pressable>
          )}
        </View>

        {editingDetails ? (
          <View style={styles.form}>
            <TextField label="First name" value={firstNameDraft} onChangeText={setFirstNameDraft} />
            <TextField label="Last name" value={lastNameDraft} onChangeText={setLastNameDraft} />
            <TextField
              label="Status flag"
              value={flagDraft}
              onChangeText={setFlagDraft}
              placeholder="e.g. Homebound, Hospital"
            />
            <TextField
              label="Phone"
              value={phoneDraft}
              onChangeText={setPhoneDraft}
              keyboardType="phone-pad"
            />
            <TextField
              label="Email"
              value={emailDraft}
              onChangeText={setEmailDraft}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextField
              label="Address"
              value={addressDraft}
              onChangeText={setAddressDraft}
              placeholder="Street, city"
            />
            {detailsError && <Text style={styles.error}>{detailsError}</Text>}
            <View style={styles.actions}>
              <PrimaryButton
                title="Cancel"
                variant="secondary"
                onPress={cancelEditDetails}
                disabled={savingDetails}
                style={styles.actionButton}
              />
              <PrimaryButton
                title="Save details"
                onPress={saveDetails}
                loading={savingDetails}
                style={styles.actionButton}
              />
            </View>
          </View>
        ) : (
          <>
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
          </>
        )}
      </Card>

      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
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

      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={typography.sectionTitle}>In case of emergency</Text>
          {!editingEmergency && (
            <Pressable onPress={startAddEmergency}>
              <Text style={styles.link}>Add</Text>
            </Pressable>
          )}
        </View>

        {person.emergencyContacts.map((c) =>
          editingEmergency?.mode === "edit" && editingEmergency.id === c.id ? (
            <RelatedForm
              key={c.id}
              kind="emergency"
              name={relatedName}
              relationship={relatedRelationship}
              phone={relatedPhone}
              email={relatedEmail}
              error={relatedError}
              saving={savingRelated}
              onChangeName={setRelatedName}
              onChangeRelationship={setRelatedRelationship}
              onChangePhone={setRelatedPhone}
              onChangeEmail={setRelatedEmail}
              onCancel={cancelRelated}
              onSave={saveRelated}
            />
          ) : (
            <View key={c.id} style={styles.relatedRow}>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyStrong}>
                  {c.name} {c.relationship ? `· ${c.relationship}` : ""}
                </Text>
                <Pressable onPress={() => Linking.openURL(`tel:${c.phone}`)}>
                  <Text style={styles.link}>{c.phone}</Text>
                </Pressable>
                {c.email ? <Text style={typography.caption}>{c.email}</Text> : null}
              </View>
              {!editingRelated && (
                <View style={styles.relatedActions}>
                  <Pressable onPress={() => startEditEmergency(c)}>
                    <Text style={styles.link}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => removeEmergency(c)}>
                    <Text style={styles.dangerLink}>Remove</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )
        )}

        {person.emergencyContacts.length === 0 && !editingEmergency && (
          <Text style={typography.caption}>No emergency contacts on file yet.</Text>
        )}

        {editingEmergency?.mode === "add" && (
          <RelatedForm
            kind="emergency"
            name={relatedName}
            relationship={relatedRelationship}
            phone={relatedPhone}
            email={relatedEmail}
            error={relatedError}
            saving={savingRelated}
            onChangeName={setRelatedName}
            onChangeRelationship={setRelatedRelationship}
            onChangePhone={setRelatedPhone}
            onChangeEmail={setRelatedEmail}
            onCancel={cancelRelated}
            onSave={saveRelated}
          />
        )}
      </Card>

      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={typography.sectionTitle}>Family</Text>
          {!editingFamily && (
            <Pressable onPress={startAddFamily}>
              <Text style={styles.link}>Add</Text>
            </Pressable>
          )}
        </View>

        {person.familyMembers.map((f) =>
          editingFamily?.mode === "edit" && editingFamily.id === f.id ? (
            <RelatedForm
              key={f.id}
              kind="family"
              name={relatedName}
              relationship={relatedRelationship}
              phone={relatedPhone}
              error={relatedError}
              saving={savingRelated}
              onChangeName={setRelatedName}
              onChangeRelationship={setRelatedRelationship}
              onChangePhone={setRelatedPhone}
              onCancel={cancelRelated}
              onSave={saveRelated}
            />
          ) : (
            <View key={f.id} style={styles.relatedRow}>
              <View style={{ flex: 1 }}>
                <Text style={typography.body}>
                  {f.name} — {f.relationship}
                </Text>
                {f.phone ? (
                  <Pressable onPress={() => Linking.openURL(`tel:${f.phone}`)}>
                    <Text style={styles.link}>{f.phone}</Text>
                  </Pressable>
                ) : null}
              </View>
              {!editingRelated && (
                <View style={styles.relatedActions}>
                  <Pressable onPress={() => startEditFamily(f)}>
                    <Text style={styles.link}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => removeFamily(f)}>
                    <Text style={styles.dangerLink}>Remove</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )
        )}

        {person.familyMembers.length === 0 && !editingFamily && (
          <Text style={typography.caption}>No family members on file yet.</Text>
        )}

        {editingFamily?.mode === "add" && (
          <RelatedForm
            kind="family"
            name={relatedName}
            relationship={relatedRelationship}
            phone={relatedPhone}
            error={relatedError}
            saving={savingRelated}
            onChangeName={setRelatedName}
            onChangeRelationship={setRelatedRelationship}
            onChangePhone={setRelatedPhone}
            onCancel={cancelRelated}
            onSave={saveRelated}
          />
        )}

        <Text style={[typography.caption, { marginTop: spacing.xs }]}>
          Shown here for context only — open their own file for anything about them.
        </Text>
      </Card>

      {relatedSaved && <Text style={styles.savedBanner}>{relatedSaved}</Text>}

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

function RelatedForm({
  kind,
  name,
  relationship,
  phone,
  email,
  error,
  saving,
  onChangeName,
  onChangeRelationship,
  onChangePhone,
  onChangeEmail,
  onCancel,
  onSave,
}: {
  kind: "emergency" | "family";
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  error: string | null;
  saving: boolean;
  onChangeName: (v: string) => void;
  onChangeRelationship: (v: string) => void;
  onChangePhone: (v: string) => void;
  onChangeEmail?: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.form}>
      <TextField label="Name" value={name} onChangeText={onChangeName} />
      <TextField
        label="Relationship"
        value={relationship}
        onChangeText={onChangeRelationship}
        placeholder={kind === "family" ? "Spouse, Daughter…" : "Optional"}
      />
      <TextField
        label="Phone"
        value={phone}
        onChangeText={onChangePhone}
        keyboardType="phone-pad"
        placeholder={kind === "family" ? "Optional" : undefined}
      />
      {kind === "emergency" && onChangeEmail && (
        <TextField
          label="Email"
          value={email ?? ""}
          onChangeText={onChangeEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Optional"
        />
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.actions}>
        <PrimaryButton
          title="Cancel"
          variant="secondary"
          onPress={onCancel}
          disabled={saving}
          style={styles.actionButton}
        />
        <PrimaryButton title="Save" onPress={onSave} loading={saving} style={styles.actionButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  flag: { color: colors.warning, fontWeight: "600", marginTop: 2 },
  flagMuted: { color: colors.textMuted, marginTop: 2, fontSize: 14 },
  card: { marginTop: spacing.md, gap: 4 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  form: { marginTop: spacing.xs },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionButton: { flex: 1 },
  savedBanner: {
    marginTop: spacing.sm,
    color: colors.accent,
    fontWeight: "600",
    fontSize: 14,
  },
  error: { color: colors.danger, marginBottom: spacing.sm },
  link: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  dangerLink: { color: colors.danger, fontSize: 14, fontWeight: "600" },
  relatedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  relatedActions: { gap: spacing.xs, alignItems: "flex-end" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
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
