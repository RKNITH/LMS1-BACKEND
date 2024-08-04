import { Router } from "express";
const router = Router();
import { isLoggedIn } from "../middleware/auth.middleware.js";
import {
  createChatroom,
  getAllConversationOfUser,
  getUsersList,
  getUnreadCountList,
  incUnreadCount,
  decUnreadCount,
} from "../controller/chat.controller.js";

router.post("/chatroom/create", isLoggedIn, createChatroom);
router.get("/conversations/get", isLoggedIn, getAllConversationOfUser);
router.get("/users/list", isLoggedIn, getUsersList);
router.post("/unread-counts/get", isLoggedIn, getUnreadCountList);
router.post("/unread-counts/inc", isLoggedIn, incUnreadCount);
router.post("/unread-counts/dec", isLoggedIn, decUnreadCount);

export default router;
