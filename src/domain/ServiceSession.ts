export interface ServiceSession {
  readonly id: number;
  readonly state: "ACTIVE" | "CLOSED";
}
