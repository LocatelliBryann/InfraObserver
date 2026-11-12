import { Router } from "express";

import {
  agentEnrollmentController,
  authenticateAgent,
  endpointController,
  requireAuth,
} from "../config/dependencies";
import { requireSameOrigin } from "../middlewares/same-origin.middleware";

const endpointRouter = Router();

endpointRouter.get("/", requireAuth, (req, res) => {
  void endpointController.findAll(req, res);
});

endpointRouter.post("/register", authenticateAgent, (req, res) => {
  void endpointController.register(req, res);
});

endpointRouter.post("/:id/revoke", requireSameOrigin, requireAuth, (req, res) => {
  void agentEnrollmentController.revokeEndpoint(req, res);
});

export default endpointRouter;
