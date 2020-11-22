import axios from "axios";
import { createHmac } from "crypto";
import { config } from "dotenv";
import moment from "moment";

config();

jest.mock("axios", () => {
  return {
    post: jest.fn((url, { params }) =>
      Promise.resolve({ data: { url, params } })
    ),
    get: jest.fn((url, { params }) =>
      Promise.resolve({ data: { url, params } })
    ),
  };
});

describe("Tests", function () {
  it("slack", async () => {
    const requestBody = {
      type: "commands_changed",
      event_ts: "1361482916.000004",
    };
    const timestamp = moment().unix();
    const sigBasestring = "v0:" + timestamp + ":" + JSON.stringify(requestBody);
    const { SLACK_SIGNING_SECRET } = process.env;
    const mySignature =
      "v0=" +
      createHmac("sha256", SLACK_SIGNING_SECRET)
        .update(sigBasestring, "utf8")
        .digest("hex");

    const { data } = await axios.post(
      "http://localhost:5000/slack/events",
      requestBody,
      {
        headers: {
          "x-slack-signature": mySignature,
          "x-slack-request-timestamp": timestamp,
        },
      }
    );

    console.log({ data });
  });
});
