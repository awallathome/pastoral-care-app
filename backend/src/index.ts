import "dotenv/config";
import "./types";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { peopleRouter } from "./routes/people";
import { visitsRouter } from "./routes/visits";
import { usersRouter } from "./routes/users";
import { notificationsRouter } from "./routes/notifications";
import { cronRouter } from "./routes/cron";
import { requireAuth } from "./middleware/auth";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);

// Everything below requires a valid login.
app.use("/people", requireAuth, peopleRouter);
app.use("/visits", requireAuth, visitsRouter);
app.use("/users", requireAuth, usersRouter);
app.use("/notifications", requireAuth, notificationsRouter);

// Not behind requireAuth — a cron scheduler has no user login. Protected by
// its own shared-secret check instead (see routes/cron.ts).
app.use("/cron", cronRouter);

// On Vercel the app is invoked as a serverless function, not run with
// `node`, so it must not bind a port there — Vercel detects the
// `export default app` below and calls it directly. Locally (`npm run dev`
// / `npm start`), process.env.VERCEL is unset, so this still listens as before.
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 4000;
  app.listen(PORT, () => {
    console.log(`Pastoral Care API listening on http://localhost:${PORT}`);
  });
}

export default app;
