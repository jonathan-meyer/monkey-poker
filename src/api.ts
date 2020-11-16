import { App } from "@slack/bolt";
import { config } from "dotenv";
import { Router } from "express";
import { readFileSync } from "fs";
import handlebars from "handlebars";
import { resolve } from "path";
import Auth from "./model/Auth";

config();

const { SLACK_CLIENT_SECRET, SLACK_CLIENT_ID, SLACK_APP_ID } = process.env;

export const apiRouter = (app: App): Router => {
  const router = Router();

  router.get("/health", (req, res, next) => {
    res.json({ SLACK_APP_ID });
  });

  router.get("/install", async (req, res, next) => {
    const { query } = req;
    const { code } = query;

    try {
      const access = await app.client.oauth.v2.access({
        client_secret: SLACK_CLIENT_SECRET,
        client_id: SLACK_CLIENT_ID,
        code: code as string,
      });

      const auth =
        (await Auth.findOne({ teamId: access.team["id"] })) || new Auth();

      await auth
        .overwrite({
          teamId: access.team["id"],
          botToken: access.access_token,
          botId: access.app_id,
          botUserId: access.bot_user_id,
        })
        .save();

      res.redirect(`https://slack.com/apps/${access.app_id}`);
    } catch (ex) {
      console.error(ex);
      res.status(403).json(ex.data);
    }
  });

  router.get("/", (req, res, next) =>
    res.send(
      handlebars.compile(
        readFileSync(resolve("public/index.handlebars"), "utf-8")
      )({
        SLACK_CLIENT_ID,
        SLACK_APP_ID,
      })
    )
  );

  return router;
};
