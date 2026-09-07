import { prisma } from "../db";
import { VisitStatus } from "../constants";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface ReminderSummary {
  userId: string;
  overdueCount: number;
  todayCount: number;
}

/**
 * Finds visits that are overdue or scheduled for later today, groups them
 * by the parishioner's assigned minister, and sends one summary push
 * notification per minister via Expo's push service — "so people don't
 * slip under radar," per the original request.
 *
 * Known limitation for a prototype: this doesn't record that a reminder
 * was already sent, so calling it more than once in a day re-notifies for
 * the same visits. Fine for manual testing or a once-daily cron; worth
 * adding a `lastReminderSentAt` column before running this unattended
 * against a real, frequently-triggered schedule.
 */
export async function sendVisitReminders(): Promise<{ notified: number; skippedNoDevice: number }> {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const visits = await prisma.visit.findMany({
    where: {
      status: VisitStatus.SCHEDULED,
      scheduledFor: { lte: endOfToday },
    },
    include: { person: { select: { assignedMinisterId: true } } },
  });

  const byMinister = new Map<string, ReminderSummary>();
  for (const visit of visits) {
    const ministerId = visit.person.assignedMinisterId;
    if (!ministerId) continue; // unassigned parishioner — no one to remind

    const summary = byMinister.get(ministerId) ?? { userId: ministerId, overdueCount: 0, todayCount: 0 };
    if (visit.scheduledFor.getTime() < now.getTime()) summary.overdueCount += 1;
    else summary.todayCount += 1;
    byMinister.set(ministerId, summary);
  }

  let notified = 0;
  let skippedNoDevice = 0;

  for (const summary of byMinister.values()) {
    if (summary.overdueCount === 0 && summary.todayCount === 0) continue;

    const tokens = await prisma.pushToken.findMany({ where: { userId: summary.userId } });
    if (tokens.length === 0) {
      skippedNoDevice += 1;
      continue;
    }

    const parts: string[] = [];
    if (summary.overdueCount > 0) {
      parts.push(`${summary.overdueCount} overdue visit${summary.overdueCount === 1 ? "" : "s"}`);
    }
    if (summary.todayCount > 0) {
      parts.push(`${summary.todayCount} visit${summary.todayCount === 1 ? "" : "s"} today`);
    }
    const body = `You have ${parts.join(" and ")} — check your schedule.`;

    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      sound: "default",
      title: "Pastoral Care",
      body,
      data: { type: "visit-reminder" },
    }));

    // Best-effort: Expo's push endpoint is a public HTTPS API, not
    // authenticated per-app by default. A failed send here shouldn't stop
    // reminders going out to everyone else.
    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });
      notified += 1;
    } catch (err) {
      console.error(`Failed to send reminder push to user ${summary.userId}:`, err);
    }
  }

  return { notified, skippedNoDevice };
}
