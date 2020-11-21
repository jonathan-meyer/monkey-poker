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

export const StoryModel = model<IStoryDocument>("Story", StorySchema);

export const createStory = async (story: IStory) =>
  await StoryModel.create(story);

export const getStory = async (storyId: string) =>
  await StoryModel.findById(storyId);

export const updateStoryVote = async (storyId: string, vote: IVote) =>
  await StoryModel.findById(storyId).then((story) => {
    story.votes.push(vote);
    return story.save();
  });

export const toggleStoryShowVotes = async (storyId: string) =>
  await StoryModel.findById(storyId).then((story) => {
    story.show_votes = !story.show_votes;
    return story.save();
  });

export default StoryModel;
