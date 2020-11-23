import {
  AllMiddlewareArgs,
  App,
  BlockAction,
  ExpressReceiver,
  LogLevel,
  SlackActionMiddlewareArgs,
} from "@slack/bolt";
import { config } from "dotenv";
import { inspect } from "util";
import Auth from "../model/Auth";
import {
  createStory,
  getStory,
  toggleStoryShowVotes,
  updateStoryVote,
} from "../model/Story";
import { dialog, message } from "./slack";

config();

const { SLACK_DEBUG } = process.env;

export const monkeyPoker = (receiver: ExpressReceiver): App => {
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

  // app.use(async (args) => {
  //   const { payload, context, next, client, logger } = args;

  //   logger.debug(inspect({ payload }, { colors: true, depth: 1 }));
  //   logger.debug(inspect({ context }, { colors: true, depth: 1 }));

  //   try {
  //     if (payload["channel_id"]) {
  //       const info = await client.conversations.info({
  //         channel: payload["channel_id"],
  //       });

  //       logger.debug(info);

  //       // } else {
  //       //   await respond(
  //       //     `I need to be added to this channel first. \`/invite <@${context.botUserId}>\``
  //       //   );
  //     }
  //   } catch (ex) {
  //     logger.error(ex.message);
  //   }

  //   await next();
  // });

  app.view("story-point-modal", async (args) => {
    const { view, body, client, ack, context, logger } = args;
    const { story_id, ts } = JSON.parse(view.private_metadata);

    await ack();

    logger.debug(
      "story-point-modal",
      inspect({ view }, { colors: true, depth: null })
    );

    const vote = {
      userId: body.user.id,
      value: view.state.values.points.vote.selected_option.value,
    };

    try {
      const story = await updateStoryVote(story_id, vote);
      await client.chat.update({
        ...{ channel: story.channelId, ts },
        ...message(story),
      });
    } catch (ex) {
      logger.error(ex.message);
    }
  });

  app.action(
    "open_vote",
    async (
      args: SlackActionMiddlewareArgs<BlockAction> & AllMiddlewareArgs
    ) => {
      const { action, body, client, ack, logger, respond } = args;
      const { user, trigger_id, message } = body;

      await ack();

      logger.debug(
        "open_vote",
        inspect({ action }, { colors: true, depth: null })
      );
      logger.debug(
        "open_vote",
        inspect({ body }, { colors: true, depth: null })
      );

      try {
        const story = await getStory(action["value"]);
        const dlg = dialog(trigger_id, story, message.ts, user.id);

        logger.debug("open_vote", inspect(dlg, { colors: true, depth: null }));

        await client.views.open(dlg);
      } catch (ex) {
        logger.error(ex.message);
        await respond(ex.message);
      }
    }
  );

  app.action("toggle_view", async (args) => {
    const { action, ack, respond, context, logger } = args;

    await ack();

    logger.debug(
      "toggle_view",
      inspect({ action }, { colors: true, depth: null })
    );

    try {
      const story = await toggleStoryShowVotes(action["value"]);
      await respond(message(story));
    } catch (ex) {
      logger.error(ex.message);
      await respond(ex.message);
    }
  });

  app.command("/point-story", async (args) => {
    const { command, ack, say, respond, context, logger } = args;
    const { channel_id, user_id, text } = command;

    await ack();

    try {
      const story = await createStory({
        channelId: channel_id,
        userId: user_id,
        storyText: text,
      });
      const msg = message(story);

      logger.debug(
        "point-story",
        inspect({ msg }, { colors: true, depth: null })
      );

      await say(msg);
    } catch (ex) {
      logger.error(ex.message);
      await respond(ex.message);
    }
  });

  return app;
};
