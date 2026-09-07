import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { colors, radii, spacing, typography } from "../theme/theme";
import { Card } from "../components/Card";
import { TextField } from "../components/TextField";
import { PrimaryButton } from "../components/PrimaryButton";
import { api, ApiError } from "../api/client";
import { Role, ROLE_LABELS, TeamUser } from "../types";
import { useAuth } from "../auth/AuthContext";

const ROLES: Role[] = ["ADMIN", "MINISTER", "SUPPORT_STAFF"];

/**
 * Admin-only screen: create team members and activate/deactivate them.
 * Reassigning a parishioner between ministers happens on that parishioner's
 * own page (PersonDetailScreen) — this screen is about the people on staff,
 * not the roster.
 */
export function AdminUsersScreen() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<TeamUser[]>("/users");
      setUsers(data);
    } catch {
      setError("Couldn't load the team. Pull down or reopen this tab to try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleActive = async (target: TeamUser) => {
    try {
      await api.patch(`/users/${target.id}`, { active: !target.active });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't update that user.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={typography.title}>Team</Text>
        <Pressable onPress={() => setShowAddForm((v) => !v)} style={styles.addButton}>
          <Text style={styles.addButtonText}>{showAddForm ? "Cancel" : "+ Add"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {showAddForm && (
          <AddUserForm
            onCreated={() => {
              setShowAddForm(false);
              load();
            }}
          />
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        {loading ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.accent} />
        ) : (
          users.map((u) => (
            <Card key={u.id} style={styles.userCard}>
              <View style={styles.userRow}>
                <View style={{ flex: 1 }}>
                  <Text style={typography.bodyStrong}>{u.name}</Text>
                  <Text style={typography.caption}>{u.email}</Text>
                  <Text style={styles.roleLine}>
                    {ROLE_LABELS[u.role]}
                    {u._count ? ` · ${u._count.assignedPeople} assigned` : ""}
                    {!u.active ? " · Deactivated" : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => toggleActive(u)}
                  disabled={u.id === me?.id}
                  style={[
                    styles.toggleButton,
                    u.active ? styles.deactivateButton : styles.activateButton,
                    u.id === me?.id && styles.toggleDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      { color: u.active ? colors.danger : colors.accent },
                    ]}
                  >
                    {u.id === me?.id ? "You" : u.active ? "Deactivate" : "Activate"}
                  </Text>
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AddUserForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("MINISTER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await api.post("/users", { name: name.trim(), email: email.trim(), password, role });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't create that user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.formCard}>
      <Text style={typography.sectionTitle}>New team member</Text>
      <TextField label="Name" value={name} onChangeText={setName} />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextField
        label="Temporary password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="At least 8 characters"
      />
      <Text style={styles.roleLabel}>Role</Text>
      <View style={styles.roleChips}>
        {ROLES.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRole(r)}
            style={[styles.chip, role === r && styles.chipSelected]}
          >
            <Text style={[styles.chipText, role === r && styles.chipTextSelected]}>
              {ROLE_LABELS[r]}
            </Text>
          </Pressable>
        ))}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton
        title="Create account"
        onPress={save}
        loading={saving}
        disabled={!name.trim() || !email.trim() || password.length < 8}
        style={{ marginTop: spacing.sm }}
      />
    </Card>
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
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  formCard: { marginBottom: spacing.md, gap: 0 },
  roleLabel: { ...typography.caption, fontWeight: "600", marginBottom: spacing.xs },
  roleChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textPrimary, fontSize: 14 },
  chipTextSelected: { color: colors.accent, fontWeight: "600" },
  userCard: { marginBottom: spacing.sm },
  userRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  roleLine: { ...typography.caption, marginTop: 2 },
  toggleButton: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deactivateButton: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  activateButton: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  toggleDisabled: { opacity: 0.4 },
  toggleButtonText: { fontSize: 13, fontWeight: "600" },
  error: { color: colors.danger, marginBottom: spacing.md },
});
