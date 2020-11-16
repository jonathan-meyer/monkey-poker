import { App, ExpressReceiver, LogLevel } from "@slack/bolt";
import { config } from "dotenv";
import { resolve } from "path";
import { inspect } from "util";
import Auth from "./model/Auth";
import Story from "./model/Story";
import { IVote } from "./model/Vote";
import { dialog, message } from "./slack";
import handlebars from "handlebars";
import { readFileSync } from "fs";

config();

const {
  SLACK_SIGNING_SECRET,
  SLACK_DEBUG,
  SLACK_CLIENT_SECRET,
  SLACK_CLIENT_ID,
  SLACK_APP_ID,
} = process.env;

const receiver = new ExpressReceiver({
  signingSecret: SLACK_SIGNING_SECRET,
});

const app = new App({
  logLevel: SLACK_DEBUG === "yes" ? LogLevel.DEBUG : LogLevel.INFO,
  convoStore: {
    set: () => Promise.resolve(),
    get: () => Promise.resolve({}),
  },
  authorize: async ({ teamId }) => {
    const { botToken, botId, botUserId } = await Auth.findOne({ teamId });
    return { botToken, botId, botUserId };
  },
  receiver,
});

receiver.router.get("/stats", (req, res, next) => {
  console.log("/stats");
  res.json({});
});

receiver.router.get("/install", async (req, res, next) => {
  const { query } = req;

  console.log({ query });

  try {
    const access = await app.client.oauth.v2.access({
      client_secret: SLACK_CLIENT_SECRET,
      client_id: SLACK_CLIENT_ID,
      code: query.code as string,
    });

    console.log({ access });

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
    console.error({ ex });
    res.status(403).json(ex.data);
  }
});

receiver.router.get("/", (req, res, next) =>
  res.send(
    handlebars.compile(
      readFileSync(resolve("public/index.handlebars"), "utf-8")
    )({
      SLACK_CLIENT_ID,
      SLACK_APP_ID,
    })
  )
);

app.use(async (args) => {
  const { payload, next, client, logger } = args;

  console.log(inspect({ payload }, { colors: true, depth: 1 }));

  try {
    if (payload["channel_id"]) {
      await client.conversations.info({ channel: payload["channel_id"] });
      // } else {
      //   await respond(
      //     `I need to be added to this channel first. \`/invite <@${context.botUserId}>\``
      //   );
    }
  } catch (ex) {
    logger.error(ex.message);
  }

  await next();
});

app.use(async ({ context, next, logger }) => {
  context.createStory = (channelId, userId, storyText) =>
    new Promise((resolve, reject) => {
      logger.debug({ createStory: { channelId, userId, storyText } });

      Story.create({ channelId, userId, storyText })
        .then((story) => {
          logger.debug({ story });
          resolve(story);
        })
        .catch(reject);
    });

  context.getStory = (storyId) =>
    new Promise((resolve, reject) => {
      logger.debug({ getStory: { storyId } });

      Story.findById(storyId)
        .then((story) => {
          logger.debug({ story });
          resolve(story);
        })
        .catch(reject);
    });

  context.updateStoryVote = (storyId: string, vote: IVote) =>
    new Promise((resolve, reject) => {
      logger.debug({ updateStoryVote: { storyId, vote } });

      Story.findById(storyId)
        .then((story) => {
          story.votes.push(vote);
          story
            .save()
            .then(() => {
              logger.debug({ story });
              resolve(story);
            })
            .catch(reject);
        })
        .catch(reject);
    });

  context.toggleStoryShowVotes = (storyId: string) =>
    new Promise((resolve, reject) => {
      logger.debug({ toggleStoryShowVotes: { storyId } });

      Story.findById(storyId)
        .then((story) => {
          story.show_votes = !story.show_votes;
          story
            .save()
            .then(() => {
              logger.debug({ story });
              resolve(story);
            })
            .catch(reject);
        })
        .catch(reject);
    });

  await next();
});

app.view(
  "story-point-modal",
  async ({ view, body, client, ack, context, logger }) => {
    const { story_id, ts } = JSON.parse(view.private_metadata);

    const vote = {
      userId: body.user.id,
      value: view.state.values.points.vote.selected_option.value,
    };

    await ack();

    try {
      const story = await context.updateStoryVote(story_id, vote);
      await client.chat.update({
        ...{ channel: story.channelId, ts },
        ...message(story),
      });
    } catch (ex) {
      logger.error(ex);
    }
  }
);

app.action("open_vote", async (args) => {
  const { action, body, client, ack, context, logger, respond } = args;
  const { user } = body;

  await ack();

  try {
    const story = await context.getStory(action["value"]);
    await client.views.open(dialog("trigger_id", story, "message.ts", user.id));
  } catch (ex) {
    logger.error(ex);
    await respond(ex.message);
  }
});

app.action("toggle_view", async ({ action, ack, respond, context, logger }) => {
  await ack();

  try {
    const story = await context.toggleStoryShowVotes(action["value"]);
    await respond(message(story));
  } catch (ex) {
    logger.error(ex);
    await respond(ex.message);
  }
});

app.command(
  "/point-story",
  async ({ command, ack, say, respond, context, logger }) => {
    const { channel_id, user_id, text } = command;

    await ack();

    try {
      const story = await context.createStory(channel_id, user_id, text);
      await say(message(story));
    } catch (ex) {
      logger.error(ex);
      await respond(ex.message);
    }
  }
);

// respond to hellos
app.message(/hello/i, async (args) => {
  const { message, say, logger } = args;
  logger.debug(inspect({ message }, { colors: true, depth: null }));

  try {
    await say("Hello Back!");
  } catch (ex) {
    logger.error(ex.message);
  }
});

export default app;
