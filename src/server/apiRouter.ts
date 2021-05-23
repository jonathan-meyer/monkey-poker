import { App } from "@slack/bolt";
import { config } from "dotenv";
import { Router } from "express";
import { isString } from "lodash";
import { FilterQuery, PaginateOptions } from "mongoose";
import { ParsedQs } from "qs";
import AuthModel from "../model/Auth";
import StoryModel, { IStoryDocument } from "../model/Story";

config();

const { SLACK_CLIENT_SECRET, SLACK_CLIENT_ID, SLACK_APP_ID } = process.env;
const { DEBUG, WEBPACK_MODE } = process.env;

export const apiRouter = (app: App): Router => {
  const router = Router();

  router.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  router.get("/config", (req, res) => {
    res.json({
      ok: true,
      env: { SLACK_CLIENT_ID, SLACK_APP_ID, DEBUG, WEBPACK_MODE },
    });
  });

  router.get("/install", async (req, res) => {
    const { query } = req;
    const { code } = query;

    try {
      const access = await app.client.oauth.v2.access({
        client_secret: SLACK_CLIENT_SECRET,
        client_id: SLACK_CLIENT_ID,
        code: code as string,
      });

      const auth =
        (await AuthModel.findOne({ teamId: access.team["id"] })) ||
        new AuthModel();

      await auth
        .overwrite({
          teamId: access.team["id"],
          botToken: access.access_token as string,
          botId: access.app_id as string,
          botUserId: access.bot_user_id as string,
        })
        .save();

      res.redirect(`https://slack.com/apps/${access.app_id}`);
    } catch (ex) {
      console.error(ex);
      res.status(403).json(ex.data);
    }
  });

  const queryOptions = (query: ParsedQs): FilterQuery<IStoryDocument> => {
    const opts: FilterQuery<IStoryDocument> = {};

    if (query.channelId && isString(query.channelId)) {
      opts.channelId = query.channelId;
    }

    if (query.userId && isString(query.userId)) {
      opts.userId = query.userId;
    }

    if (query.storyText && isString(query.storyText)) {
      opts.storyText = new RegExp(`${query.storyText}`, "i");
    }

    return opts;
  };

  const pageOptions = (query: ParsedQs): PaginateOptions => ({
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 10,
  });

  router.get("/story", async (req, res) => {
    const stories = await StoryModel.paginate(
      queryOptions(req.query),
      pageOptions(req.query)
    );
    res.json(stories);
  });

  router.get("/story/:id", async (req, res) => {
    const { id } = req.params;
    const story = await StoryModel.findById(id);

    if (story) {
      res.json(story);
    } else {
      res.status(404).json({ error: "Not Found" });
    }
  });

  return router;
};
