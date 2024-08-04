import { Schema, model } from "mongoose";

const chatroomSchema = new Schema({
  name: {
    type: String,
  },
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  unreadCounts: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      count: {
        type: Number,
        default: 0,
      },
    },
  ],
});

const Chatroom = model("Chatroom", chatroomSchema);

export default Chatroom;
