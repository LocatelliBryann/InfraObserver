import { Router } from "express";

import { fileEventController } from "../config/dependencies";

const fileEventRouter = Router();

fileEventRouter.get("/", (req, res) => {
  void fileEventController.findRecent(req, res);
});

fileEventRouter.post("/", (req, res) => {
  void fileEventController.create(req, res);
});

export default fileEventRouter;