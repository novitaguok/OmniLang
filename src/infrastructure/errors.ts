/** Base class for adapter failures (HTTP channel errors, cloud API errors). */
export class InfrastructureError extends Error {
  constructor(message: string, override readonly cause?: unknown) {
    super(message);
    this.name = new.target.name;
  }
}
