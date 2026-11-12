import { Router } from "express";

import {
  authenticateAgent,
  fileEventController,
  requireAuth,
} from "../config/dependencies";

const fileEventRouter = Router();

fileEventRouter.get("/", requireAuth, (req, res) => {
  void fileEventController.findRecent(req, res);
});

fileEventRouter.post("/", authenticateAgent, (req, res) => {
  void fileEventController.create(req, res);
});

export default fileEventRouter;