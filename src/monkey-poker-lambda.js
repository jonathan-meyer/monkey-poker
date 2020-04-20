require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./monkey-poker");

exports.lambdaHandler = async (event, context) => {
  console.log({ env: process.env });

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("connected to Mongo");
    console.log({ app });
  } catch (ex) {
    console.error(ex);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({}),
  };
};
