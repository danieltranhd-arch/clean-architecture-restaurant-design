import type { DiningSession } from "../../domain/DiningSession.js";

export interface DiningSessionRepository {
  hasActiveOccupancy(ids: readonly number[]): Promise<boolean>;
  create(session: DiningSession): Promise<{ id: number; code: string }>;
}
