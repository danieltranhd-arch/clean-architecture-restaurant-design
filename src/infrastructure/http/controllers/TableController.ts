import type { RequestHandler } from "express";
import type { ListSeatingCandidates } from "../../../application/queries/ListSeatingCandidates.js";

export class TableController {
  constructor(private readonly candidates: ListSeatingCandidates) {}

  list: RequestHandler = async (request, response) => {
    const input = request.query.partySize;
    const partySize = typeof input === "string" && /^\d+$/.test(input) ? Number(input) : NaN;
    response.json({ tables: await this.candidates.execute(partySize) });
  };
}
