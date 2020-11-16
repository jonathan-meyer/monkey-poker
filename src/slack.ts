import { Option, ViewsOpenArguments } from "@slack/web-api";

export const toggleViewButton = (storyId: string, showVotes: boolean) => {
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
    button["style"] = "danger";
    button["confirm"] = {
      title: { type: "plain_text", text: "Show all Points?" },
      text: { type: "plain_text", text: "Are you sure?" },
      confirm: { type: "plain_text", text: "Yes" },
      deny: { type: "plain_text", text: "No!" },
    };
  }

  return button;
};

export const message = ({ _id, userId, storyText, show_votes, votes }) => {
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

export const option = (value: string | number): Option => ({
  text: {
    type: "mrkdwn",
    text: `${value || ""}`,
  },
  value: `${value || ""}`,
});

export const dialog = (
  trigger_id: string,
  { _id, storyText, votes, channelId },
  ts: string,
  user_id: string
): ViewsOpenArguments => ({
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
          options: [0, 1, 2, 3, 5, 8, 13, 20, 40, 100].map((n) => option(n)),
        },
      },
    ],
  },
});
