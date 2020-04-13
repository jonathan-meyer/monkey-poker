require("dotenv").config();

const { App, LogLevel } = require("@slack/bolt");

const port = process.env.PORT || 3000;
const app = new App({
  token: process.env.SLACK_TOKEN_BOT,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
});

app.view("story-point-modal", async ({ ack, body, view, context, user }) => {
  await ack();

  const { state } = view;
  const { values } = state;

  console.log({ user, values });
});

app.action("open_vote", async ({ action, respond, say, ack }) => {
  console.log({ action });
  const { actions, message, trigger_id } = action;

  say("```" + JSON.stringify({ action }, null, 2) + "```");

  await ack();

  // actions.map(({ action_id, value }) => {
  //   if (action_id === "open_vote") {
  //     try {
  //       app.client.views
  //         .open({
  //           trigger_id,
  //           view: {
  //             type: "modal",
  //             callback_id: "story-point-modal",
  //             title: {
  //               type: "plain_text",
  //               text: "Point This Story",
  //               emoji: true,
  //             },
  //             submit: {
  //               type: "plain_text",
  //               text: "Save",
  //               emoji: true,
  //             },
  //             close: {
  //               type: "plain_text",
  //               text: "Cancel",
  //               emoji: true,
  //             },
  //             blocks: [
  //               {
  //                 type: "section",
  //                 block_id: "story",
  //                 text: {
  //                   type: "mrkdwn",
  //                   text: `_"${value}"_`,
  //                 },
  //               },
  //               {
  //                 type: "input",
  //                 block_id: "points",
  //                 label: {
  //                   type: "plain_text",
  //                   text: "my label",
  //                 },
  //                 element: {
  //                   type: "radio_buttons",
  //                   action_id: "vote",
  //                   options: [0, 2, 3, 5, 13, 20, 40, 100, "?", "&infin;"].map(
  //                     (n) => ({
  //                       text: {
  //                         type: "mrkdwn",
  //                         text: `${n}`,
  //                       },
  //                       value: `${n}`,
  //                     })
  //                   ),
  //                 },
  //               },
  //             ],
  //           },
  //         })
  //         .then(() => {
  //           respond(message);
  //         })
  //         .catch((error) => {
  //           console.log("view.open", error);
  //         });
  //     } catch (ex) {
  //       console.log("action", ex);
  //     }
  //   }
  // });
});

app.command("/point-story", async ({ command, ack, say, context }) => {
  const { channel_id, user_name, text, trigger_id } = command;

  console.log({ command, context });
  console.log({ channel_id, user_name, text, trigger_id });

  await ack();

  app.client.conversations
    .members({ token: context.botToken, channel: channel_id })
    .then(({ members }) => {
      Promise.all(
        members.map((id) =>
          app.client.users
            .info({ token: context.botToken, user: id })
            .then(({ user: { name, real_name } }) => ({ name, real_name }))
            .catch((error) => console.log("users.info", error))
        )
      ).then((users) => {
        app.client.chat
          .postMessage({
            token: context.botToken,
            channel: channel_id,
            text: `Time to point a story.`,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `:raising_hand: @${user_name} has requested the team point this story:`,
                },
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `> "_${text}"_`,
                },
              },
              {
                type: "actions",
                elements: [
                  {
                    type: "button",
                    action_id: `open_vote`,
                    value: text,
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
                  text: users
                    .map(({ real_name }) => `${real_name} :question:`)
                    .join(", "),
                },
              },
            ],
          })
          .then(() => {})
          .catch((error) => {
            console.log("chat.postMessage", error);
          });
      });
    })
    .catch((error) => {
      console.log("conversations.members", error);
    });
});

app.error((error) => {
  console.error({ error });
});

app.message(async ({ message, say }) => {
  const reversedText = message.text.split("").reverse().join("");
  console.log({ reversedText });
  await say(reversedText);
});

(async () => {
  await app.start(port);
  console.log("⚡️ Bolt app is running!");
})();
