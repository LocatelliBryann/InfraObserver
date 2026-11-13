import { AlertController } from "../controllers/alert.controller";
import { EndpointController } from "../controllers/endpoint.controller";
import { FileEventController } from "../controllers/file-event.controller";
import { MetricController } from "../controllers/metric.controller";

import { PrismaAlertRepository } from "../repositories/alert.repository";
import { PrismaEndpointRepository } from "../repositories/endpoint.repository";
import { PrismaFileEventRepository } from "../repositories/file-event.repository";
import { PrismaMetricRepository } from "../repositories/metric.repository";

import { AlertService } from "../services/alert.service";
import { EndpointService } from "../services/endpoint.service";
import { FileEventService } from "../services/file-event.service";
import { MetricService } from "../services/metric.service";

import { EndpointHealthController } from "../controllers/endpoint-health.controller";
import { EndpointHealthService } from "../services/endpoint-health.service";
import { EndpointStatusService } from "../services/endpoint-status.service";

import { OfflineDetectionJob } from "../jobs/offline-detection.job";
import { getOfflineCheckIntervalMs } from "./monitoring";
import { RetentionJob } from "../jobs/retention.job";
import { PrismaRetentionRepository } from "../repositories/retention.repository";
import { RetentionService } from "../services/retention.service";
import { getRetentionDays, RETENTION_RUN_INTERVAL_MS } from "./retention";

import { PrometheusController } from "../controllers/prometheus.controller";

import { AuthController } from "../controllers/auth.controller";
import { createLoginRateLimit } from "../middlewares/login-rate-limit.middleware";
import { createRequireAuth } from "../middlewares/require-auth.middleware";
import { PrismaUserRepository } from "../repositories/user.repository";
import { AuthService } from "../services/auth.service";
import {
  metricsRegistry,
  registerDomainMetrics,
  retentionDeletedCounter,
} from "../observability/metrics";
import { AgentUpdateController } from "../controllers/agent-update.controller";
import { GitHubAgentReleaseSource } from "../services/agent-release.source";
import { AgentUpdateService } from "../services/agent-update.service";
import { getAgentUpdateConfig } from "./agent-update";
import { AgentEnrollmentController } from "../controllers/agent-enrollment.controller";
import { ClientController } from "../controllers/client.controller";
import { createAuthenticateAgent } from "../middlewares/agent-auth.middleware";
import { createEnrollmentRateLimit } from "../middlewares/enrollment-rate-limit.middleware";
import { PrismaClientRepository } from "../repositories/client.repository";
import { PrismaEnrollmentTokenRepository } from "../repositories/enrollment-token.repository";
import { AgentCredentialService } from "../services/agent-credential.service";
import { ClientService } from "../services/client.service";
import { logger } from "./logger";

const userRepository = new PrismaUserRepository();
export const authService = new AuthService(userRepository);
export const authController = new AuthController(authService);
export const requireAuth = createRequireAuth(authService);
export const loginRateLimit = createLoginRateLimit();

const endpointRepository = new PrismaEndpointRepository();
const endpointService = new EndpointService(endpointRepository);

export const endpointController = new EndpointController(endpointService);

// Clientes, tokens de instalação e credenciais dos agentes.
const enrollmentTokenRepository = new PrismaEnrollmentTokenRepository();
const clientService = new ClientService(
  new PrismaClientRepository(),
  enrollmentTokenRepository,
);

export const clientController = new ClientController(clientService);

const agentCredentialService = new AgentCredentialService(
  endpointRepository,
  enrollmentTokenRepository,
);

export const authenticateAgent = createAuthenticateAgent(agentCredentialService);
export const agentEnrollmentController = new AgentEnrollmentController(
  agentCredentialService,
);
export const enrollmentRateLimit = createEnrollmentRateLimit();

const alertRepository = new PrismaAlertRepository();
const alertService = new AlertService(alertRepository);

export const alertController = new AlertController(alertService);

const endpointStatusService = new EndpointStatusService(
  endpointRepository,
  alertRepository,
);

export const offlineDetectionJob = new OfflineDetectionJob(
  endpointStatusService,
  getOfflineCheckIntervalMs(),
);

// RF23: limpeza diária do que passou do período de retenção (60 dias).
export const retentionJob = new RetentionJob(
  new RetentionService(new PrismaRetentionRepository(), getRetentionDays()),
  RETENTION_RUN_INTERVAL_MS,
  retentionDeletedCounter,
);

const metricRepository = new PrismaMetricRepository();
const metricService = new MetricService(
  metricRepository,
  alertService,
  endpointStatusService,
);

export const metricController = new MetricController(metricService);

const endpointHealthService = new EndpointHealthService(
  endpointService,
  metricService,
  alertService,
);

export const endpointHealthController =
  new EndpointHealthController(endpointHealthService);

registerDomainMetrics(metricsRegistry, {
  endpointHealth: endpointHealthService,
  alerts: alertService,
});

export const prometheusController = new PrometheusController(metricsRegistry);

const fileEventRepository = new PrismaFileEventRepository();
const fileEventService = new FileEventService(fileEventRepository);

export const fileEventController = new FileEventController(
  fileEventService,
);

const agentUpdateConfig = getAgentUpdateConfig();
const agentUpdateService = new AgentUpdateService(
  new GitHubAgentReleaseSource(agentUpdateConfig.repository),
  {
    enabled: agentUpdateConfig.enabled,
    pinnedVersion: agentUpdateConfig.pinnedVersion,
    logger,
  },
);

export const agentUpdateController = new AgentUpdateController(
  agentUpdateService,
);
