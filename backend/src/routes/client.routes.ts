import { Router } from "express";

import {
  clientController,
  monitoredDirectoriesController,
  requireAuth,
} from "../config/dependencies";
import { requireSameOrigin } from "../middlewares/same-origin.middleware";

// Cadastro de clientes e tokens de instalação (só administradores).
const clientRouter = Router();

clientRouter.use(requireAuth);

clientRouter.get("/", (req, res) => {
  void clientController.findAll(req, res);
});

clientRouter.post("/", requireSameOrigin, (req, res) => {
  void clientController.create(req, res);
});

clientRouter.get("/:clientId/enrollment-tokens", (req, res) => {
  void clientController.findEnrollmentTokens(req, res);
});

clientRouter.post("/:clientId/enrollment-tokens", requireSameOrigin, (req, res) => {
  void clientController.createEnrollmentToken(req, res);
});

clientRouter.post(
  "/:clientId/enrollment-tokens/:tokenId/reveal",
  requireSameOrigin,
  (req, res) => {
    void clientController.revealEnrollmentToken(req, res);
  },
);

clientRouter.post(
  "/:clientId/enrollment-tokens/:tokenId/revoke",
  requireSameOrigin,
  (req, res) => {
    void clientController.revokeEnrollmentToken(req, res);
  },
);

// RF10: pastas monitoradas de todos os PCs do cliente sem lista própria.
clientRouter.get("/:clientId/monitored-directories", (req, res) => {
  void monitoredDirectoriesController.getClient(req, res);
});

clientRouter.put(
  "/:clientId/monitored-directories",
  requireSameOrigin,
  (req, res) => {
    void monitoredDirectoriesController.configureClient(req, res);
  },
);

export default clientRouter;
