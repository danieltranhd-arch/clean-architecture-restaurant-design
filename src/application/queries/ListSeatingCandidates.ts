import { ApplicationError, isPositiveInteger } from "../ApplicationError.js";
import type { TableRepository } from "../ports/TableRepository.js";

// Supports table selection during SeatWalkInGuest.
export class ListSeatingCandidates {
  constructor(private readonly tables: Pick<TableRepository, "listAvailable">) {}

  async execute(partySize: number) {
    if (!isPositiveInteger(partySize)) {
      throw new ApplicationError("INVALID_INPUT", "Party size must be a positive integer.");
    }
    const tables = await this.tables.listAvailable();
    return tables.map(table => ({
      id: table.id,
      code: table.code,
      seats: table.seats,
      areaId: table.areaId,
      fitsParty: table.seats >= partySize,
    })).sort((a, b) => Number(b.fitsParty) - Number(a.fitsParty) || a.seats - b.seats || a.id - b.id);
  }
}
