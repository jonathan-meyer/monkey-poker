import { App } from "@slack/bolt";
import { config } from "dotenv";
import { Router } from "express";

config();

const { SLACK_CLIENT_ID, SLACK_APP_ID } = process.env;

export const pageRouter = (app: App): Router => {
  const router = Router();

  router.get("/", (req, res) => {
    res.render("index", { SLACK_CLIENT_ID, SLACK_APP_ID });
  });

  router.get("/dashboard", (req, res) => {
    res.render("dashboard", { SLACK_CLIENT_ID, SLACK_APP_ID });
  });

  return router;
};
