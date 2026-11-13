import type {
  RetentionRepository,
  RetentionResult,
} from "../repositories/retention.repository";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RetentionRun extends RetentionResult {
  cutoff: Date;
}

export class RetentionService {
  constructor(
    private readonly repository: RetentionRepository,
    private readonly retentionDays: number,
  ) {}

  get enabled(): boolean {
    return this.retentionDays > 0;
  }

  get days(): number {
    return this.retentionDays;
  }

  cutoffFor(now: Date): Date {
    return new Date(now.getTime() - this.retentionDays * DAY_MS);
  }

  /**
   * Apaga o que passou do período de retenção. Com retenção 0 (desligada),
   * não apaga nada e devolve null.
   */
  async purge(now: Date = new Date()): Promise<RetentionRun | null> {
    if (!this.enabled) {
      return null;
    }

    const cutoff = this.cutoffFor(now);
    const result = await this.repository.deleteOlderThan(cutoff);

    return { cutoff, ...result };
  }
}
