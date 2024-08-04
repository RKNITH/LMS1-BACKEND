import { Router } from "express";
import { isLoggedIn } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import {
  changePassword,
  forgotPassword,
  getLoggedInUserDetails,
  login,
  logout,
  register,
  resetPassword,
  updateProfile,
} from "../controller/user.controller.js";

const router = Router();

router.route("/register").post(upload.single("avatar"), register);
router
  .route("/me")
  .get(isLoggedIn, getLoggedInUserDetails)
  .put(isLoggedIn, upload.single("avatar"), updateProfile);

router.route("/login").post(login);
router.route("/logout").get(isLoggedIn, logout);
router.route("/reset").post(forgotPassword);
router.route("/reset/:resetToken").post(resetPassword);
router.route("/change-password").post(isLoggedIn, changePassword);

export default router;
