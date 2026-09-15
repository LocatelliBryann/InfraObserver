import { Router } from "express";

import { fileEventController } from "../config/dependencies";

const fileEventRouter = Router();

fileEventRouter.post("/", (req, res) => {
  void fileEventController.create(req, res);
});

export default fileEventRouter;