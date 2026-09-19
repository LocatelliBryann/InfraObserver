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

const endpointRepository = new PrismaEndpointRepository();
const endpointService = new EndpointService(endpointRepository);

export const endpointController = new EndpointController(endpointService);

const alertRepository = new PrismaAlertRepository();
const alertService = new AlertService(alertRepository);

export const alertController = new AlertController(alertService);

const metricRepository = new PrismaMetricRepository();
const metricService = new MetricService(metricRepository, alertService);

export const metricController = new MetricController(metricService);

const fileEventRepository = new PrismaFileEventRepository();
const fileEventService = new FileEventService(fileEventRepository);

export const fileEventController = new FileEventController(
  fileEventService,
);