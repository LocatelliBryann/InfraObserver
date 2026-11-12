import { Router } from "express";

import {
  agentUpdateController,
  authenticateAgent,
} from "../config/dependencies";

const agentUpdateRouter = Router();

agentUpdateRouter.get("/", authenticateAgent, (req, res) => {
  void agentUpdateController.available(req, res);
});

export default agentUpdateRouter;
