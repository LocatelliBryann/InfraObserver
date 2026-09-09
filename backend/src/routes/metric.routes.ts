import { Router } from "express";

import { metricController } from "../config/dependencies";

const metricRouter = Router();

metricRouter.post("/", (req, res) => {
  void metricController.create(req, res);
});

export default metricRouter;