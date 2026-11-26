import { Router } from "express";
import type { DiningSessionController } from "./controllers/DiningSessionController.js";
import type { TableController } from "./controllers/TableController.js";

export function createRoutes(diningSessions: DiningSessionController, tables: TableController): Router {
  const router = Router();
  router.get("/tables", tables.list);
  router.post("/dining-sessions", diningSessions.seat);
  return router;
}
