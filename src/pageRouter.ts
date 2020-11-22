import { App } from "@slack/bolt";
import { config } from "dotenv";
import { Router } from "express";

config();

const { SLACK_CLIENT_ID, SLACK_APP_ID } = process.env;

export const pageRouter = (app: App): Router => {
  const router = Router();

  router.get("/:page?", (req, res) => {
    res.render(req.params.page || "index", { SLACK_CLIENT_ID, SLACK_APP_ID });
  });

  return router;
};
