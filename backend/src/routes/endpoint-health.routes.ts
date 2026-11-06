import { Router } from "express";

import { endpointHealthController, requireAuth } from "../config/dependencies";

const endpointHealthRouter = Router();

endpointHealthRouter.get("/", requireAuth, (req, res) => {
  void endpointHealthController.findAll(req, res);
});

export default endpointHealthRouter;