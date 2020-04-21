require("dotenv").config();

const { App, LogLevel } = require("@slack/bolt");

const Story = require("./Story");
const Auth = require("./Auth");

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
  convoStore: {
    set: () => Promise.resolve(),
    get: () => Promise.resolve({}),
  },
  authorize: async ({ teamId, enterpriseId, userId, conversationId }) => {
    console.log({ teamId, enterpriseId, userId, conversationId });
    const { botToken, botId, botUserId } = await Auth.findOne({ teamId });

    return { botToken, botId, botUserId };
  },
});

const toggleViewButton = (storyId, showVotes) => {
  const button = {
    type: "button",
    action_id: `toggle_view`,
    value: storyId,
    text: {
      type: "plain_text",
      text: showVotes ? "Hide Points" : "Show Points",
    },
  };

  if (!showVotes) {
    button.style = "danger";
    button.confirm = {
      title: { type: "plain_text", text: "Show all Points?" },
      text: { type: "plain_text", text: "Are you sure?" },
      confirm: { type: "plain_text", text: "Yes" },
      deny: { type: "plain_text", text: "No!" },
    };
  }

  return button;
};

const message = (
  { _id, userId, storyText, show_votes, votes },
  { members }
) => {
  const members_votes = Object.entries({
    ...members.reduce((p, c) => ({ ...p, [c]: null }), {}),
    ...votes.reduce((p, c) => ({ ...p, [c.userId]: c.value }), {}),
  });

  const all_voted = members_votes.reduce((p, c) => c[1] != null && p, true);
  const two_voted = members_votes.filter((v) => v[1] != null) >= 2;

  return {
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
          all_voted || two_voted
            ? toggleViewButton(_id, show_votes)
            : undefined,
        ].filter((e) => e),
      },
      {
        type: "section",
        block_id: "members",
        text: {
          type: "mrkdwn",
          text: members_votes
            .map(
              ([id, vote]) =>
                `<@${id}> (${
                  vote
                    ? show_votes
                      ? vote
                      : ":heavy_check_mark:"
                    : ":question:"
                })`
            )
            .join(" | "),
        },
      },
    ],
  };
};

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
    private_metadata: JSON.stringify({ ts, story_id: _id }),
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

app.receiver.app.use("/install", async (req, res, next) => {
  const { query } = req;
  console.log({ query });

  try {
    const access = await app.client.oauth.v2.access({
      client_secret: process.env.SLACK_CLIENT_SECRET,
      client_id: process.env.SLACK_CLIENT_ID,
      code: query.code,
    });

    const auth = (await Auth.findOne({ teamId: access.team.id })) || new Auth();

    await auth
      .overwrite({
        teamId: access.team.id,
        botToken: access.access_token,
        botId: access.app_id,
        botUserId: access.bot_user_id,
      })
      .save();

    console.log({ auth });

    res.redirect(`https://slack.com/apps/${access.app_id}`);
  } catch (ex) {
    console.error({ ex });

    res.status(403).json(ex.data);
  }
});

app.receiver.app.use((req, res, next) => {
  res.status(404).json({
    error: {
      message: "This is a slack app.",
      url: "https://slack.com/apps/A012361FWDN",
      src: "https://github.com/jonathan-meyer/monkey-poker",
    },
  });
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

  context.updateStoryVote = (storyId, vote) =>
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

  context.toggleStoryShowVotes = (storyId) =>
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

app.view("story-point-modal", async ({ view, body, client, ack, context }) => {
  const { story_id, ts } = JSON.parse(view.private_metadata);

  const vote = {
    userId: body.user.id,
    value: view.state.values.points.vote.selected_option.value,
  };

  await ack();

  try {
    const story = await context.updateStoryVote(story_id, vote);
    const channel = story.channelId;
    const members = await client.conversations.members({ channel });

    await client.chat.update({
      ...{ channel, ts },
      ...message(story, members, body.user.id),
    });
  } catch (ex) {
    logger.error(ex);
    await respond(ex.message);
  }
});

app.action("open_vote", async ({ action, body, client, ack, context }) => {
  const { trigger_id, message, user } = body;

  await ack();

  try {
    const story = await context.getStory(action.value);
    await client.views.open(dialog(trigger_id, story, message.ts, user.id));
  } catch (ex) {
    logger.error(ex);
    await respond(ex.message);
  }
});

app.action(
  "toggle_view",
  async ({ action, body, client, ack, respond, context, logger }) => {
    const { user, channel } = body;

    await ack();

    try {
      const story = await context.toggleStoryShowVotes(action.value);
      const members = await client.conversations.members({
        channel: channel.id,
      });

      await respond(message(story, members, user.id));
    } catch (ex) {
      logger.error(ex);
      await respond(ex.message);
    }
  }
);

app.shortcut(
  "point-story",
  async ({ shortcut, ack, say, respond, client, context, logger }) => {
    const { channel_id, user_id, text } = shortcut;

    logger.debug({ shortcut });

    await ack();

    try {
      const members = await client.conversations.members({
        channel: channel_id,
      });
      const story = await context.createStory(channel_id, user_id, text);
      await say(message(story, members));
    } catch (ex) {
      logger.error(ex);
      await respond(ex.message);
    }
  }
);

app.command(
  "/point-story",
  async ({ command, ack, say, respond, client, context, logger }) => {
    const { channel_id, user_id, text } = command;

    logger.debug({ command });

    await ack();

    try {
      const members = await client.conversations.members({
        channel: channel_id,
      });
      const story = await context.createStory(channel_id, user_id, text);
      await say(message(story, members));
    } catch (ex) {
      logger.error(ex);
      await respond(ex.message);
    }
  }
);

module.exports = app;
