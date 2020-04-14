require("dotenv").config();

const { App, LogLevel } = require("@slack/bolt");

const port = process.env.PORT || 3000;

const db = {};

const app = new App({
  token: process.env.SLACK_TOKEN_BOT,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
  convoStore: {
    set: (conversationId, value, expiresAt) =>
      new Promise((resolve, reject) => {
        console.log("set", { conversationId, value, expiresAt });
        db[conversationId] = value;
        resolve();
      }),
    get: (conversationId) =>
      new Promise((resolve, reject) => {
        const conversation = db[conversationId] || {};
        console.log("get", { conversationId, conversation });
        resolve(conversation);
      }),
  },
});

const message = ({ user_name, story, members }) => ({
  text: `Time to point a story.`,
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:raising_hand: <@${user_name}> has requested the team point this story:`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `> "_${story}"_`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: `open_vote`,
          value: story,
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
        text: members.map((id) => `[<@${id}>:question:]`).join(" "),
      },
    },
  ],
});

const dialog = ({ trigger_id, story }) => ({
  trigger_id,
  view: {
    type: "modal",
    callback_id: "story-point-modal",
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
          text: `_"${story}"_`,
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
          options: [0, 2, 3, 5, 13, 20, 40, 100, "?", "&infin;"].map((n) => ({
            text: {
              type: "mrkdwn",
              text: `${n}`,
            },
            value: `${n}`,
          })),
        },
      },
    ],
  },
});

app.error((error) => {
  console.error("global", { error });
});

app.view("story-point-modal", async ({ view, body, ack, logger }) => {
  const { value } = view.state.values.points.vote.selected_option;
  const { user } = body;

  await ack();

  logger.info({ view });
});

app.action("open_vote", async ({ action, body, client, ack, logger }) => {
  const { value } = action;
  const { trigger_id } = body;

  await ack();

  logger.info({ trigger_id, story: value });

  client.views
    .open(dialog({ trigger_id, story: value }))
    .then(() => {})
    .catch((error) => logger.error("views.open", error));
});

app.command("/point-story", async ({ command, ack, say, client, logger }) => {
  const { channel_id, user_name, text } = command;

  await ack();

  client.conversations
    .members({ channel: channel_id })
    .then(({ members }) => {
      say(message({ user_name, story: text, members }));
    })
    .catch((error) => {
      logger.error("conversations.members", error);
    });
});

(async () => {
  await app.start(port);
  console.log("⚡️ Bolt app is running!");
})();
