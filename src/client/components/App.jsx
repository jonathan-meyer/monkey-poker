import React from "react";

const App = () => (
  <>
    <a
      class="btn"
      role="button"
      target="_blank"
      href="https://slack.com/oauth/v2/authorize?client_id={{SLACK_CLIENT_ID}}&scope=channels:read,chat:write,chat:write.public,commands,groups:read,groups:write,im:read,im:write,mpim:read,mpim:write,users.profile:read,users:read"
    >
      <img
        alt="Add to Slack"
        height="40"
        width="139"
        src="https://platform.slack-edge.com/img/add_to_slack.png"
        srcset="
                https://platform.slack-edge.com/img/add_to_slack.png    1x,
                https://platform.slack-edge.com/img/add_to_slack@2x.png 2x
              "
      />
    </a>
    <a
      class="btn btn-primary mr-2"
      target="_blank"
      role="button"
      href="https://slack.com/apps/{{SLACK_APP_ID}}"
    >
      Slack App Page
    </a>
    <a
      class="btn btn-primary mr-2"
      target="_blank"
      role="button"
      href="https://github.com/jonathan-meyer/monkey-poker"
    >
      Source Code
    </a>
  </>
);

export default App;
