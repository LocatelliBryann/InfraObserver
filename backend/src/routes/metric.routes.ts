import { Router } from "express";

import { metricController } from "../config/dependencies";

const metricRouter = Router();

metricRouter.get("/", (req, res) => {
  void metricController.findRecent(req, res);
});

metricRouter.post("/", (req, res) => {
  void metricController.create(req, res);
});

export default metricRouter;