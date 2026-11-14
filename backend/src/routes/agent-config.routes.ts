import { Router } from "express";

import {
  authenticateAgent,
  monitoredDirectoriesController,
} from "../config/dependencies";

// Configuração que o agente busca no servidor (RF10: pastas monitoradas).
// A credencial do PC só vale para o próprio agentId da URL.
const agentConfigRouter = Router();

agentConfigRouter.get("/:agentId/config", authenticateAgent, (req, res) => {
  void monitoredDirectoriesController.agentConfig(req, res);
});

agentConfigRouter.post(
  "/:agentId/config/status",
  authenticateAgent,
  (req, res) => {
    void monitoredDirectoriesController.agentReport(req, res);
  },
);

export default agentConfigRouter;
