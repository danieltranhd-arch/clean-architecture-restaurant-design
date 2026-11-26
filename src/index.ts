import express from "express";
import { ListSeatingCandidates } from "./application/queries/ListSeatingCandidates.js";
import { SeatWalkInGuest } from "./application/usecases/SeatWalkInGuest.js";
import { createPool } from "./infrastructure/database/pool.js";
import { PostgresTransactionManager } from "./infrastructure/database/PostgresTransactionManager.js";
import { PostgresTableRepository } from "./infrastructure/database/repositories/PostgresTableRepository.js";
import { DiningSessionController } from "./infrastructure/http/controllers/DiningSessionController.js";
import { TableController } from "./infrastructure/http/controllers/TableController.js";
import { errorHandler } from "./infrastructure/http/errorHandler.js";
import { createRoutes } from "./infrastructure/http/routes.js";

const pool = createPool();
const seating = new SeatWalkInGuest(new PostgresTransactionManager(pool));
const candidates = new ListSeatingCandidates(new PostgresTableRepository(pool));

const app = express();
app.use(express.json());
app.use(createRoutes(new DiningSessionController(seating), new TableController(candidates)));
app.use(errorHandler);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Restaurant API listening on port ${port}`));
