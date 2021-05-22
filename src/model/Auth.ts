import { Document, model, Model, Schema } from "mongoose";

export const AuthSchema = new Schema(
  {
    teamId: { type: String, required: true },
    botToken: { type: String, required: true },
    botId: { type: String, required: true },
    botUserId: { type: String, required: true },
  },
  { timestamps: true }
);

export interface IAuth {
  teamId: string;
  botToken: string;
  botId: string;
  botUserId: string;
}

export interface IAuthDocument extends IAuth, Document {}
export interface IAuthModel extends Model<IAuthDocument> {}

const AuthModel = model<IAuthDocument>("Auth", AuthSchema);

export default AuthModel;
