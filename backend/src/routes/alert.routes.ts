import { Router } from "express";

import { alertController, requireAuth } from "../config/dependencies";

const alertRouter = Router();

alertRouter.get("/", requireAuth, (req, res) => {
  void alertController.findAll(req, res);
});

export default alertRouter;