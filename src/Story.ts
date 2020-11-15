import { Document, model, Model, Schema } from "mongoose";
import { IVote, VoteSchema } from "./Vote";

export const StorySchema = new Schema(
  {
    channelId: { type: String, required: true },
    userId: { type: String, required: true },
    storyText: { type: String, required: true },
    show_votes: { type: Boolean, required: false, default: false },
    votes: { type: [VoteSchema], required: false, default: [] },
  },
  { timestamps: true }
);

export interface IStory {
  channelId: string;
  userId: string;
  storyText: string;
  show_votes?: boolean;
  votes?: IVote[];
}

export interface IStoryDocument extends IStory, Document {}
export interface IStoryModel extends Model<IStoryDocument> {}

const StoryModel = model<IStoryDocument>("Story", StorySchema);

export default StoryModel;
