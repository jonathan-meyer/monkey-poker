require("dotenv").config();

const { App, LogLevel } = require("@slack/bolt");
const mongoose = require("mongoose");

const Story = require("./Story");
const Vote = require("./Vote");

const app = new App({
  token: process.env.SLACK_TOKEN_BOT,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
  convoStore: {
    set: () => Promise.resolve(),
    get: () => Promise.resolve({}),
  },
});

const message = ({ _id, userId, storyText, votes }, { members }) => ({
  text: `Time to point a story.`,
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:raising_hand: <@${userId}> has requested the team point this story:`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `> "_${storyText}"_`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: `open_vote`,
          value: _id,
          text: {
            type: "plain_text",
            text: `Point Story`,
          },
        },
      ],
    },
    {
      type: "section",
      block_id: "members",
      text: {
        type: "mrkdwn",
        text: Object.entries({
          ...members.reduce((p, c) => ({ ...p, [c]: null }), {}),
          ...votes.reduce((p, c) => ({ ...p, [c.userId]: c.value }), {}),
        })
          .map(
            ([id, vote]) =>
              `<@${id}> (${vote ? ":heavy_check_mark:" : ":question:"})`
          )
          .join(" | "),
      },
    },
  ],
});

const option = (value) =>
  value != undefined
    ? {
        text: {
          type: "mrkdwn",
          text: `${value}`,
        },
        value: `${value}`,
      }
    : undefined;

const dialog = (
  trigger_id,
  { _id, storyText, votes, channelId },
  ts,
  user_id
) => ({
  trigger_id,
  view: {
    type: "modal",
    callback_id: "story-point-modal",
    private_metadata: JSON.stringify({
      channel_id: channelId,
      ts,
      story_id: _id,
    }),
    title: {
      type: "plain_text",
      text: "Point This Story",
      emoji: true,
    },
    submit: {
      type: "plain_text",
      text: "Save",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true,
    },
    blocks: [
      {
        type: "section",
        block_id: "story",
        text: {
          type: "mrkdwn",
          text: `_"${storyText}"_`,
        },
      },
      {
        type: "input",
        block_id: "points",
        label: {
          type: "plain_text",
          text: "Select a point value:",
        },
        element: {
          type: "radio_buttons",
          action_id: "vote",
          initial_option: option(
            votes
              .filter((vote) => vote.userId === user_id)
              .reduce((p, c) => c.value, undefined)
          ),
          options: [0, 0.5, 1, 2, 3, 5, 13, 20, 40, 100].map(option),
        },
      },
    ],
  },
});

app.error((error) => {
  console.error("global", { error });
});

app.use(async ({ context, next, logger }) => {
  context.createStory = (channelId, userId, storyText) =>
    new Promise((resolve, reject) => {
      logger.debug({ createStory: { channelId, userId, storyText } });

      Story.findOne({ channelId, userId, storyText })
        .then((story) => {
          return story || Story.create({ channelId, userId, storyText });
        })
        .then((story) => {
          logger.debug({ story });
          resolve(story);
        })
        .catch(reject);
    });

  context.getStory = (storyId) => {
    logger.debug("getStory", { storyId });
    return Story.findById(storyId);
  };

  context.updateStory = (storyId, vote) =>
    new Promise((resolve, reject) => {
      logger.debug({ updateStory: { storyId, vote } });

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

  await next();
});

app.view("story-point-modal", async ({ view, body, client, ack, context }) => {
  const { private_metadata, state } = view;
  const { channel_id, ts, story_id } = JSON.parse(private_metadata);
  const vote = {
    userId: body.user.id,
    value: state.values.points.vote.selected_option.value,
  };

  await ack();

  const members = await client.conversations.members({ channel: channel_id });
  const story = await context.updateStory(story_id, vote);

  await client.chat.update({
    channel: channel_id,
    ts,
    ...message(story, members, body.user.id),
  });
});

app.action("open_vote", async ({ action, body, client, ack, context }) => {
  const { trigger_id, message, user } = body;

  await ack();

  const story = await context.getStory(action.value);

  await client.views.open(dialog(trigger_id, story, message.ts, user.id));
});

app.command("/point-story", async ({ command, ack, say, client, context }) => {
  const { channel_id, user_id, text } = command;

  await ack();

  const members = await client.conversations.members({ channel: channel_id });
  const story = await context.createStory(channel_id, user_id, text);

  await say(message(story, members));
});

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("connected to Mongo");

  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app is running!");
})();
