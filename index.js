require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");

const { WebClient } = require("@slack/web-api");
const { createMessageAdapter } = require("@slack/interactive-messages");

const port = process.env.PORT || 3000;

const app = express();
const web = new WebClient(process.env.SLACK_TOKEN_BOT);
const slackInteractions = createMessageAdapter(
  process.env.SLACK_SIGNING_SECRET
);

// slackInteractions.action({ type: "radio_buttons" }, (payload) => {
//   const { actions, trigger_id, view } = payload;
//   const { state } = view;

//   console.log({ state });

//   actions.map(({ selected_option }) => {
//     console.log(selected_option);
//   });
// });

slackInteractions.viewSubmission(
  { callbackId: "story-point-modal" },
  (payload) => {
    const { user, view } = payload;
    const { state } = view;
    const { values } = state;
    console.log({ user, values });
  }
);

slackInteractions.action({ type: "button" }, (payload, respond) => {
  const { actions, message, trigger_id } = payload;

  actions.map(({ action_id, value }) => {
    if (action_id === "open_vote") {
      try {
        web.views
          .open({
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
                    text: `_"${value}"_`,
                  },
                },
                {
                  type: "input",
                  block_id: "points",
                  label: {
                    type: "plain_text",
                    text: "my label",
                  },
                  element: {
                    type: "radio_buttons",
                    action_id: "vote",
                    options: [0, 2, 3, 5, 13, 20, 40, 100, "?", "&infin;"].map(
                      (n) => ({
                        text: {
                          type: "mrkdwn",
                          text: `${n}`,
                        },
                        value: `${n}`,
                      })
                    ),
                  },
                },
              ],
            },
          })
          .then(() => {
            respond(message);
          })
          .catch((error) => {
            console.log("view.open", error);
          });
      } catch (ex) {
        console.log("action", ex);
      }
    }
  });
});

app.use(morgan("dev"));

app.use("/slack/actions", slackInteractions.requestListener());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/slack/command", (req, res) => {
  const { command, channel_id, user_name, text, trigger_id } = req.body;

  console.log({ command, channel_id, user_name, text, trigger_id });

  web.conversations
    .members({ channel: channel_id })
    .then(({ members }) => {
      members.map((id) => {
        web.users.info({ user: id }).then((payload) => {
          console.log({ payload });
        });
      });

      web.chat
        .postMessage({
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
                text: members
                  .map((member) => `${member} :question:`)
                  .join(", "),
              },
            },
          ],
        })
        .then(() => {})
        .catch((error) => {
          console.log("web.chat", error);
        });
    })
    .catch((error) => {
      console.log("web.conversations", error);
    });

  res.json();
});

app.get("/", (req, res) =>
  res.json({ msg: "this is not the endpoint you are looking for" })
);

app.listen(port, () =>
  console.log(`now listening to http://localhost:${port}`)
);
