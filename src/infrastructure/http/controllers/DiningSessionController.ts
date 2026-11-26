import type { RequestHandler } from "express";
import type { SeatWalkInGuest } from "../../../application/usecases/SeatWalkInGuest.js";

export class DiningSessionController {
  constructor(private readonly seatWalkInGuest: SeatWalkInGuest) {}

  seat: RequestHandler = async (request, response) => {
    const { partySize, tableIds, capacityOverrideConfirmed } = request.body ?? {};
    const result = await this.seatWalkInGuest.execute({ partySize, tableIds, capacityOverrideConfirmed });
    response.status(201).json(result);
  };
}
