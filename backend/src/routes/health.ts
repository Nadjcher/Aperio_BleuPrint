import { Router } from "express";
import { AppDataSource } from "../db/data-source.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  let db = "down";
  try {
    await AppDataSource.query("SELECT 1");
    db = "up";
  } catch {
    db = "down";
  }
  res.json({ status: "ok", db, time: new Date().toISOString() });
});
