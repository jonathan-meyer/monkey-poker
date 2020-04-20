require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./monkey-poker");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("connected to Mongo");

  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app is running!");
})();
