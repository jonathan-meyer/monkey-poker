import { App, ExpressReceiver, LogLevel } from "@slack/bolt";
import { config } from "dotenv";
import { inspect } from "util";
import { apiRouter } from "./api";
import Auth from "./model/Auth";
import Story, { IStory } from "./model/Story";
import { IVote } from "./model/Vote";
import { dialog, message } from "./slack";

config();

const { SLACK_SIGNING_SECRET, SLACK_DEBUG } = process.env;

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

receiver.router.use(apiRouter(app));

app.use(async (args) => {
  const { payload, context, next, client, logger } = args;

  logger.debug(inspect({ payload }, { colors: true, depth: 1 }));
  logger.debug(inspect({ context }, { colors: true, depth: 1 }));

  try {
    if (payload["channel_id"]) {
      const info = await client.conversations.info({
        channel: payload["channel_id"],
      });

      logger.debug(info);

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

const createStory = async (story: IStory) => await Story.create(story);

const getStory = async (storyId: string) => await Story.findById(storyId);

const updateStoryVote = async (storyId: string, vote: IVote) =>
  await Story.findById(storyId).then((story) => {
    story.votes.push(vote);
    return story.save();
  });

const toggleStoryShowVotes = async (storyId: string) =>
  await Story.findById(storyId).then((story) => {
    story.show_votes = !story.show_votes;
    return story.save();
  });

app.view("story-point-modal", async (args) => {
  const { view, body, client, ack, context, logger } = args;
  const { story_id, ts } = JSON.parse(view.private_metadata);

  const vote = {
    userId: body.user.id,
    value: view.state.values.points.vote.selected_option.value,
  };

  await ack();

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

app.action("open_vote", async (args) => {
  const { action, body, client, ack, logger, respond } = args;
  const { user } = body;

  await ack();

  try {
    const story = await getStory(action["value"]);
    await client.views.open(dialog("trigger_id", story, "message.ts", user.id));
  } catch (ex) {
    logger.error(ex.message);
    await respond(ex.message);
  }
});

app.action("toggle_view", async (args) => {
  const { action, ack, respond, context, logger } = args;

  await ack();

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
    await say(message(story));
  } catch (ex) {
    logger.error(ex.message);
    await respond(ex.message);
  }
});

app.message(/hello/i, async (args) => {
  const { message, say, logger } = args;

  try {
    await say("Hello Back!");
  } catch (ex) {
    logger.error(ex.message);
  }
});

export default app;
