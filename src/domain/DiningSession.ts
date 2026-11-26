export class DiningSession {
  readonly state = "ACTIVE";
  readonly leavingTime = null;

  constructor(
    readonly serviceSessionId: number,
    readonly tableIds: readonly number[],
    readonly partySize: number,
    readonly arrivalTime: Date,
  ) {
    if (!Number.isInteger(partySize) || partySize < 1) {
      throw new Error("Party size must be a positive integer.");
    }
    if (tableIds.length === 0 || new Set(tableIds).size !== tableIds.length) {
      throw new Error("A dining session requires one or more distinct tables.");
    }
  }
}
