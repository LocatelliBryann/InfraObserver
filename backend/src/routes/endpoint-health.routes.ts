import { Router } from "express";

import { endpointHealthController } from "../config/dependencies";

const endpointHealthRouter = Router();

endpointHealthRouter.get("/", (req, res) => {
  void endpointHealthController.findAll(req, res);
});

export default endpointHealthRouter;