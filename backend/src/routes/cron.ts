import { Request, Response, Router } from "express";
import { sendVisitReminders } from "../jobs/sendReminders";

export const cronRouter = Router();

// /cron/send-reminders — meant to be hit by a scheduler (Vercel Cron, which
// issues a GET and auto-attaches `Authorization: Bearer $CRON_SECRET` when
// that env var is set on the project — see vercel.json; or any external
// cron service like cron-job.org), not a logged-in minister, so it's
// protected by a shared secret instead of a JWT rather than requireAuth.
// POST is also accepted, for triggering it manually with curl.
//
// If CRON_SECRET isn't set, this is left open — convenient for trying it
// locally, but set the secret before this deployment is anything more than
// your own testing, so a stranger can't trigger pushes to your team on a whim.
async function handleSendReminders(req: Request, res: Response) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.authorization;
    if (header !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const result = await sendVisitReminders();
  res.json(result);
}

cronRouter.get("/send-reminders", handleSendReminders);
cronRouter.post("/send-reminders", handleSendReminders);
