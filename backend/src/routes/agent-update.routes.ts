import { Router } from "express";

import { agentUpdateController } from "../config/dependencies";
import { authenticateAgent } from "../middlewares/agent-auth.middleware";

const agentUpdateRouter = Router();

agentUpdateRouter.get("/", authenticateAgent, (req, res) => {
  void agentUpdateController.available(req, res);
});

export default agentUpdateRouter;
