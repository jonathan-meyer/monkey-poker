const mongoose = require("mongoose");

const { Schema, model } = mongoose;

const schema = new Schema(
  {
    teamId: { type: String, required: true },
    botToken: { type: String, required: true },
    botId: { type: String, required: true },
    botUserId: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = model("Auth", schema);
