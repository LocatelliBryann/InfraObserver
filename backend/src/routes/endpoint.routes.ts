import { Router } from "express";

import { endpointController } from "../config/dependencies";

const endpointRouter = Router();

endpointRouter.get("/", (req, res) => {
  void endpointController.findAll(req, res);
});

endpointRouter.post("/register", (req, res) => {
  void endpointController.register(req, res);
});

export default endpointRouter;