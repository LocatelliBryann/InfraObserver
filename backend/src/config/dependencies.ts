import { EndpointController } from "../controllers/endpoint.controller";
import { FileEventController } from "../controllers/file-event.controller";
import { MetricController } from "../controllers/metric.controller";

import { PrismaEndpointRepository } from "../repositories/endpoint.repository";
import { PrismaFileEventRepository } from "../repositories/file-event.repository";
import { PrismaMetricRepository } from "../repositories/metric.repository";

import { EndpointService } from "../services/endpoint.service";
import { FileEventService } from "../services/file-event.service";
import { MetricService } from "../services/metric.service";

const endpointRepository = new PrismaEndpointRepository();
const endpointService = new EndpointService(endpointRepository);

export const endpointController = new EndpointController(endpointService);

const metricRepository = new PrismaMetricRepository();
const metricService = new MetricService(metricRepository);

export const metricController = new MetricController(metricService);

const fileEventRepository = new PrismaFileEventRepository();
const fileEventService = new FileEventService(fileEventRepository);

export const fileEventController = new FileEventController(
  fileEventService,
);