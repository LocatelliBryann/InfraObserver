import { Router } from "express";

import { endpointController } from "../config/dependencies";

const endpointRouter = Router();

endpointRouter.post("/register", (req, res) => {
  void endpointController.register(req, res);
});

export default endpointRouter;