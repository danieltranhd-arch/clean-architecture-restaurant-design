export type TableState = "AVAILABLE" | "OCCUPIED" | "NEEDS_CLEANING" | "UNAVAILABLE";
export type ConfigurationState = "ENABLED" | "DISABLED";

export class Table {
  constructor(
    readonly id: number,
    readonly code: string,
    readonly seats: number,
    readonly areaId: number,
    private currentState: TableState,
    readonly configurationState: ConfigurationState,
  ) {}

  get state(): TableState {
    return this.currentState;
  }

  canSeat(): boolean {
    return this.state === "AVAILABLE" && this.configurationState === "ENABLED";
  }

  occupy(): void {
    if (!this.canSeat()) throw new Error("Only enabled, available tables can be occupied.");
    this.currentState = "OCCUPIED";
  }
}
