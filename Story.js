const mongoose = require("mongoose");

const { Schema, model } = mongoose;
const Vote = require("./Vote");

const schema = new Schema(
  {
    channelId: { type: String, required: true },
    userId: { type: String, required: true },
    storyText: { type: String, required: true },
    show_votes: { type: Boolean, required: false, default: false },
    votes: { type: [Vote.schema], required: false, default: [] },
  },
  { timestamps: true }
);

module.exports = model("Story", schema);
