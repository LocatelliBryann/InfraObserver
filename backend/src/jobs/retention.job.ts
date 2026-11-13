import type { Counter } from "prom-client";

import { logger, type Logger } from "../config/logger";
import type { RetentionRun, RetentionService } from "../services/retention.service";

type RetentionTable = "metric" | "file_event" | "alert";

export class RetentionJob {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly retentionService: Pick<
      RetentionService,
      "purge" | "enabled" | "days"
    >,
    private readonly intervalMs: number,
    private readonly deletedCounter?: Pick<Counter<"table">, "inc">,
    private readonly log: Logger = logger,
  ) {}

  start(): void {
    if (this.timer) {
      return;
    }

    if (!this.retentionService.enabled) {
      this.log.warn("Data retention disabled (DATA_RETENTION_DAYS=0)");
      return;
    }

    this.log.info(
      { retentionDays: this.retentionService.days },
      "Data retention enabled",
    );

    // Uma limpeza logo na partida e depois a cada intervalo.
    void this.runOnce();

    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.intervalMs);

    // Não segura o processo aberto só por causa da limpeza.
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(): Promise<RetentionRun | null> {
    // Evita duas limpezas ao mesmo tempo se uma demorar mais que o intervalo.
    if (this.running) {
      return null;
    }

    this.running = true;

    try {
      const run = await this.retentionService.purge();

      if (run) {
        this.count("metric", run.metrics);
        this.count("file_event", run.fileEvents);
        this.count("alert", run.alerts);

        this.log.info(
          {
            cutoff: run.cutoff.toISOString(),
            metrics: run.metrics,
            fileEvents: run.fileEvents,
            alerts: run.alerts,
          },
          "Old data removed by retention policy",
        );
      }

      return run;
    } catch (error) {
      this.log.error({ err: error }, "Data retention job failed");
      return null;
    } finally {
      this.running = false;
    }
  }

  private count(table: RetentionTable, value: number): void {
    if (value > 0) {
      this.deletedCounter?.inc({ table }, value);
    }
  }
}
