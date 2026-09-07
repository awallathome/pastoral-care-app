import "dotenv/config";
import "./types";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { peopleRouter } from "./routes/people";
import { visitsRouter } from "./routes/visits";
import { requireAuth } from "./middleware/auth";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);

// Everything below requires a valid login.
app.use("/people", requireAuth, peopleRouter);
app.use("/visits", requireAuth, visitsRouter);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`Pastoral Care API listening on http://localhost:${PORT}`);
});
