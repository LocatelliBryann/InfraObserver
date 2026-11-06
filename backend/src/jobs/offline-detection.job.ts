import { logger, type Logger } from "../config/logger";
import type { EndpointStatusService } from "../services/endpoint-status.service";

export class OfflineDetectionJob {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly endpointStatusService: Pick<
      EndpointStatusService,
      "detectOfflineEndpoints"
    >,
    private readonly intervalMs: number,
    private readonly log: Logger = logger,
  ) {}

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(): Promise<number> {
    // Evita execuções sobrepostas se uma verificação demorar mais que o intervalo.
    if (this.running) {
      return 0;
    }

    this.running = true;

    try {
      const offlineEndpoints =
        await this.endpointStatusService.detectOfflineEndpoints();

      for (const endpoint of offlineEndpoints) {
        this.log.warn(
          { endpointId: endpoint.id, hostname: endpoint.hostname },
          "Endpoint marked as OFFLINE",
        );
      }

      return offlineEndpoints.length;
    } catch (error) {
      this.log.error({ err: error }, "Offline detection job failed");
      return 0;
    } finally {
      this.running = false;
    }
  }
}
