import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "node:http";
import Stripe from "stripe";
import { Server } from "socket.io";
import { config } from "dotenv";

import connectToDB from "./config/db.config.js";
import Message from "./models/message.model.js";
import Chatroom from "./models/chatroom.model.js";
import "./config/cloudinary.config.js";

config();
connectToDB();

const app = express();
const server = createServer(app);
export const stripe = Stripe(process.env.STRIPE_SECRET);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONT_URL,
  },
});

// track the online users
let users = [];

// handle events on user connect
io.on("connection", (socket) => {
  socket.on("addUser", (userId) => {
    const isUserExist = users.find((user) => userId === user.userId);
    if (!isUserExist) {
      users.push({ userId, socketId: socket.id });
    }
    io.emit("getUsers", users);
  });

  socket.on(
    "send message",
    async ({ senderId, receiverId, content, chatroomId }) => {
      const sender = users.find((user) => user.userId === senderId);
      const receiver = users.find((user) => user.userId === receiverId);

      const message = new Message({
        sender: senderId,
        chatroomId,
        content,
      });

      const resullt = await message.save();

      if (resullt) {
        if (receiver) {
          io.to(sender.socketId)
            .to(receiver.socketId)
            .emit("get message", message);
        } else {
          io.to(sender.socketId).emit("get message", message);
          await Chatroom.findOneAndUpdate(
            { "unreadCounts.user": senderId, _id: chatroomId },
            { $inc: { "unreadCounts.$.count": 1 } },
            { new: true }
          );
        }
      }
    }
  );

  socket.on("disconnect", () => {
    users = users.filter((user) => user.socketId !== socket.id);
    io.emit("getUsers", users);
  });
});

const corsOptions = {
  origin: [process.env.FRONT_URL],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  allowedHeaders: [
    "Access-Control-Allow-Origin",
    "Content-Type",
    "Authorization",
  ],
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(corsOptions));

// importing all routes
import errorMiddleware from "./middleware/error.middleware.js";
import courseRoutes from "./routes/course.route.js";
import myCourseRoutes from "./routes/my.course.route.js";
import paymentRoutes from "./routes/payment.route.js";
import userRoutes from "./routes/user.routes.js";
import chatRoutes from "./routes/chat.route.js";
import AdminRoutes from "./routes/admin.dashboard.route.js";

// set routes to base url
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/my-course", myCourseRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/admin", AdminRoutes);

// page not found
app.all("*", (req, res) => {
  res.send("opps ! 404 error. page not found");
});

// handle error and send resopnse
app.use(errorMiddleware);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`server is running on port: ${PORT}`);
});
