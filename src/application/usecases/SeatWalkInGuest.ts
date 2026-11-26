import { DiningSession } from "../../domain/DiningSession.js";
import { ApplicationError, isPositiveInteger } from "../ApplicationError.js";
import type { TransactionManager } from "../ports/TransactionManager.js";

export interface SeatWalkInGuestInput {
  partySize: number;
  tableIds: number[];
  capacityOverrideConfirmed?: boolean;
}

export class SeatWalkInGuest {
  constructor(private readonly transactions: TransactionManager) {}

  execute({ partySize, tableIds, capacityOverrideConfirmed = false }: SeatWalkInGuestInput) {
    if (!isPositiveInteger(partySize) || !Array.isArray(tableIds) || !tableIds.length
      || !tableIds.every(isPositiveInteger) || new Set(tableIds).size !== tableIds.length
      || typeof capacityOverrideConfirmed !== "boolean") {
      throw new ApplicationError("INVALID_INPUT", "Provide a positive party size, distinct positive table IDs, and a boolean override if needed.");
    }

    return this.transactions.run(async ({ serviceSessions, tables, diningSessions }) => {
      const serviceSession = await serviceSessions.findActiveForSeating();
      if (!serviceSession) {
        throw new ApplicationError("NO_ACTIVE_SERVICE_SESSION", "No service session is open.");
      }

      const selectedTables = await tables.lockByIds(tableIds);
      if (selectedTables.length !== tableIds.length) {
        throw new ApplicationError("TABLE_NOT_FOUND", "One or more selected tables do not exist.");
      }
      if (!selectedTables.every(table => table.canSeat()) || await diningSessions.hasActiveOccupancy(tableIds)) {
        throw new ApplicationError("TABLE_NOT_AVAILABLE", "One or more selected tables cannot receive guests.");
      }

      const combinedCapacity = selectedTables.reduce((total, table) => total + table.seats, 0);
      if (combinedCapacity < partySize && !capacityOverrideConfirmed) {
        throw new ApplicationError("CAPACITY_CONFIRMATION_REQUIRED", "Confirm seating below configured capacity.", {
          partySize, combinedCapacity,
        });
      }

      const session = new DiningSession(serviceSession.id, tableIds, partySize, new Date());
      const identity = await diningSessions.create(session);
      for (const table of selectedTables) {
        table.occupy();
        await tables.save(table);
      }
      return {
        ...identity,
        ...session,
        tables: selectedTables.map(table => ({ id: table.id, state: table.state })),
      };
    });
  }
}
