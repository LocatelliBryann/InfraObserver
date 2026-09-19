import { Router } from "express";

import { alertController } from "../config/dependencies";

const alertRouter = Router();

alertRouter.get("/", (req, res) => {
  void alertController.findActive(req, res);
});

export default alertRouter;