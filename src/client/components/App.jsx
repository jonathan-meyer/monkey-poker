import Axios from "axios";
import React, { useEffect, useState } from "react";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Debug from "./Debug";
import StoryDataGrid from "./StoryDataGrid";

import "./App.css";

const App = () => {
  const [config, setConfig] = useState({});

  useEffect(() => {
    (async () => {
      const { data } = await Axios.get("/config");
      data && setConfig(data.env);
    })();
  }, []);

  const { SLACK_CLIENT_ID, SLACK_APP_ID, DEBUG } = config;

  return (
    <Container className="my-1 d-flex flex-column flex-grow-1" fluid>
      <Card className="d-flex flex-grow-1">
        <Card.Header>
          <h1>Monkey Poker</h1>
        </Card.Header>
        <Card.Body className="d-flex flex-column flex-grow-1">
          <div>
            <a
              className="btn m-0 p-0"
              role="button"
              target="_blank"
              href={`https://slack.com/oauth/v2/authorize?${Object.entries({
                client_id: SLACK_CLIENT_ID,
                scope: [
                  "channels:read",
                  "chat:write",
                  "chat:write.public",
                  "commands",
                  "groups:read",
                  "groups:write",
                  "im:read",
                  "im:write",
                  "mpim:read",
                  "mpim:write",
                  "users.profile:read",
                  "users:read",
                ].join(","),
              })
                .reduce((p, [k, v]) => [...p, `${k}=${v}`], [])
                .join("&")}`}
            >
              <img
                alt="Add to Slack"
                height="40"
                width="139"
                src="https://platform.slack-edge.com/img/add_to_slack.png"
                srcSet="
                https://platform.slack-edge.com/img/add_to_slack.png    1x,
                https://platform.slack-edge.com/img/add_to_slack@2x.png 2x
              "
              />
            </a>
            <a
              className="btn btn-primary mx-2"
              target="_blank"
              role="button"
              href={`https://slack.com/apps/${SLACK_APP_ID}`}
            >
              Slack App Page
            </a>
            <a
              className="btn btn-primary"
              target="_blank"
              role="button"
              href="https://github.com/jonathan-meyer/monkey-poker"
            >
              Source Code
            </a>
          </div>
          <StoryDataGrid />
        </Card.Body>
        <Card.Footer>2021 &copy; Monkey Poker</Card.Footer>
      </Card>
      {DEBUG && <Debug data={config} />}
    </Container>
  );
};

export default App;
