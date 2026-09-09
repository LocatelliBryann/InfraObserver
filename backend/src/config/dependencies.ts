import { EndpointController } from "../controllers/endpoint.controller";
import { PrismaEndpointRepository } from "../repositories/endpoint.repository";
import { EndpointService } from "../services/endpoint.service";

const endpointRepository = new PrismaEndpointRepository();

const endpointService = new EndpointService(endpointRepository);

export const endpointController = new EndpointController(endpointService);