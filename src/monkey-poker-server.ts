import { config } from "dotenv";
import mongoose from "mongoose";
import app from "./monkey-poker";

config();

const { PORT, MONGODB_URI } = process.env;

(async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("connected to Mongo");

    await app.start(PORT);

    console.log(`PORT: ${PORT} ⚡️ Bolt app is running!`);
  } catch (ex) {
    console.error(ex);
  }
})();
