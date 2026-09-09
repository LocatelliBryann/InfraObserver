import { EndpointController } from "../controllers/endpoint.controller";
import { MetricController } from "../controllers/metric.controller";
import { PrismaEndpointRepository } from "../repositories/endpoint.repository";
import {
  PrismaMetricRepository,
} from "../repositories/metric.repository";
import { EndpointService } from "../services/endpoint.service";
import { MetricService } from "../services/metric.service";

const endpointRepository = new PrismaEndpointRepository();
const endpointService = new EndpointService(endpointRepository);

export const endpointController = new EndpointController(endpointService);

const metricRepository = new PrismaMetricRepository();
const metricService = new MetricService(metricRepository);

export const metricController = new MetricController(metricService);