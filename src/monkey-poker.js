require("dotenv").config();

const path = require("path");
const { App, LogLevel } = require("@slack/bolt");

const Story = require("./Story");
const Auth = require("./Auth");

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: process.env.SLACK_DEBUG === "yes" ? LogLevel.DEBUG : LogLevel.INFO,
  convoStore: {
    set: () => Promise.resolve(),
    get: () => Promise.resolve({}),
  },
  authorize: async ({ teamId }) => {
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

const message = ({ _id, userId, storyText, show_votes, votes }) => {
  const members_votes = Object.entries(
    votes.reduce((p, c) => ({ ...p, [c.userId]: c.value }), {})
  );

  const two_voted = members_votes.filter((v) => v[1] != null).length >= 2;

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
          two_voted ? toggleViewButton(_id, show_votes) : undefined,
        ].filter((e) => e),
      },
      {
        type: "section",
        block_id: "votes",
        text: {
          type: "mrkdwn",
          text:
            members_votes.length > 0
              ? members_votes
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
                  .join(" | ")
              : ":ballot_box_with_ballot:",
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
          options: [0, 1, 2, 3, 5, 8, 13, 20, 40, 100].map(option),
        },
      },
    ],
  },
});

app.error((error) => {
  console.error("global", { error });
});

app.receiver.app.get("/install", async (req, res, next) => {
  const { query } = req;

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

    res.redirect(`https://slack.com/apps/${access.app_id}`);
  } catch (ex) {
    console.error({ ex });
    res.status(403).json(ex.data);
  }
});

app.receiver.app.use((req, res, next) =>
  res.sendFile(path.resolve("public/index.html"))
);

app.use(async ({ payload, context, next, client, ack, respond }) => {
  try {
    if (payload.channel_id) {
      await client.conversations.info({ channel: payload.channel_id });
    }
    await next();
  } catch (ex) {
    await ack();
    await respond(
      `I need to be added to this channel first. \`/invite <@${context.botUserId}>\``
    );
  }
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
    await client.chat.update({
      ...{ channel: story.channelId, ts },
      ...message(story),
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

app.action("toggle_view", async ({ action, ack, respond, context, logger }) => {
  await ack();

  try {
    const story = await context.toggleStoryShowVotes(action.value);
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

module.exports = app;
