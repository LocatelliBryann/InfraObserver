import { Router } from "express";

import {
  agentEnrollmentController,
  enrollmentRateLimit,
} from "../config/dependencies";

// Primeira conexão do agente instalado com o token de instalação do cliente.
const agentEnrollmentRouter = Router();

agentEnrollmentRouter.post("/", enrollmentRateLimit, (req, res) => {
  void agentEnrollmentController.enroll(req, res);
});

export default agentEnrollmentRouter;
