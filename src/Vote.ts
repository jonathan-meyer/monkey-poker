import { Document, model, Model, Schema } from "mongoose";

export const VoteSchema = new Schema(
  {
    userId: { type: String, required: true },
    value: { type: String, required: true },
  },
  { timestamps: true }
);

export interface IVote {}

export interface IVoteDocument extends IVote, Document {}
export interface IVoteModel extends Model<IVoteDocument> {}

const VoteModel = model<IVoteDocument>("Vote", VoteSchema);

export default VoteModel;
