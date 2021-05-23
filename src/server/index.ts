import { ExpressReceiver } from "@slack/bolt";
import { config } from "dotenv";
import mongoose from "mongoose";
import serveStatic from "serve-static";
import { apiRouter } from "./apiRouter";
import { monkeyPoker } from "./monkey-poker";

config();

const { PORT, MONGODB_URI } = process.env;
const { SLACK_SIGNING_SECRET } = process.env;
const { WEBPACK_MODE, DEBUG } = process.env;

if (!PORT) throw Error("PORT is not set");
if (!MONGODB_URI) throw Error("MONGODB_URI is not set");
if (!SLACK_SIGNING_SECRET) throw Error("SLACK_SIGNING_SECRET is not set");

const receiver = new ExpressReceiver({
  signingSecret: SLACK_SIGNING_SECRET,
});

const mp_app = monkeyPoker(receiver);

receiver.router.use(apiRouter(mp_app));

if (WEBPACK_MODE === "development") {
  const webpack = require("webpack");
  const webpackDevMiddleware = require("webpack-dev-middleware");
  const webpackHotMiddleware = require("webpack-hot-middleware");
  const webpackConfig = require("../../config/webpack.config.local");
  const compiler = webpack(webpackConfig);

  receiver.app
    .use(
      webpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output.publicPath,
        stats: {
          colors: true,
        },
      })
    )
    .use(webpackHotMiddleware(compiler));
} else {
  receiver.app.use(serveStatic("build/client"));
}

(async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log({ WEBPACK_MODE, DEBUG });

    await mp_app.start(PORT);

    console.log(`⚡️ Bolt app is running and listening to ${PORT}`);
  } catch (ex) {
    console.error(ex);
  }
})();
