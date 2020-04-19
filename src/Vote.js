const mongoose = require("mongoose");

const { Schema, model } = mongoose;

const schema = new Schema(
  {
    userId: { type: String, required: true },
    value: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = model("Vote", schema);
