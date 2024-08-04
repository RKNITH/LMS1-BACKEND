import cloudinary from "cloudinary";
import fs from "fs";
import crypto from "crypto";
import User from "../models/user.model.js";
import MyCourse from "../models/my.course.model.js";
import asyncHandler from "../middleware/asyncHandler.middleware.js";
import AppError from "../utils/error.utils.js";
import { forgotPasswordMail, registerMail } from "../utils/mail.utils.js";

const cookieOptions = {
  maxAge: 7 * 24 * 60 * 60 * 1000,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};

/**
 * @REGISTER
 * @ROUTE @POST
 * @ACCESS public {{url}}/api/v1/user/register
 */

export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    if (req.file) fs.rmSync(`uploads/${req.file.filename}`);
    return next(new AppError("all fields are required", 400));
  }

  if (password.length < 8) {
    if (req.file) fs.rmSync(`uploads/${req.file.filename}`);
    return next(new AppError("password must be atleast 8 char long", 400));
  }

  if (name.length < 3 || name.length > 30) {
    if (req.file) fs.rmSync(`uploads/${req.file.filename}`);
    return next(new AppError("name must atlesast 5 char and not more than 50"));
  }

  const isUserExist = await User.findOne({ email });

  if (isUserExist) {
    if (req.file) fs.rmSync(`uploads/${req.file.filename}`);
    return next(new AppError("please enter another email address", 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    avatar: {
      public_id: email,
      secure_url:
        "https://cdn3.iconfinder.com/data/icons/avatars-round-flat/33/man5-512.png",
    },
  });

  if (!user) {
    return next(
      new AppError("User registration failed, please try again", 400)
    );
  }

  // uploading user avatar on cloudinary
  if (req.file) {
    try {
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "lms",
        width: 200,
        height: 200,
        crop: "fill",
        gravity: "faces",
      });

      if (result) {
        user.avatar.public_id = result.public_id;
        user.avatar.secure_url = result.secure_url;
      }

      // removing avatar image from server
      fs.rmSync(`uploads/${req.file.filename}`);
    } catch (error) {
      return next(new AppError("file upoding error: " + error, 400));
    }
  }

  await user.save();
  user.password = undefined;

  const token = await user.generateAuthToken();

  res.cookie("token", token, cookieOptions);
  registerMail(email);

  new MyCourse({
    userId: user._id.toString(),
    myPurchasedCourses: [],
  }).save();

  res.status(200).json({
    success: true,
    message: "user registered successfully",
  });
});

/**
 * @LOGIN
 * @ROUTE @POST
 * @ACCESS public {{url}}/api/v1/user/login
 */

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("email and password are required to login", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new AppError("invaid username or password", 400));
  }

  const verifyPassword = await user.comparePassword(password);

  if (!verifyPassword) {
    return next(new AppError("invaid username or password", 400));
  }

  user.password = undefined;

  const token = await user.generateAuthToken();

  res.cookie("token", token, cookieOptions);

  res.status(200).json({
    success: true,
    message: "login successfully",
    role: user.role,
  });
});

/**
 * @LOGOUT
 * @ROUTE @GET
 * @ACCESS login user only  {{url}}/api/v1/user/logout
 */

export const logout = asyncHandler(async (req, res, next) => {
  res.cookie("token", "", { maxAge: 0, ...cookieOptions })
  res.clearCookie("token");

  res.status(200).json({
    success: true,
    message: "logout successfully",
  });
});

/**
 * @USER_DETAILS
 * @ROUTE @GET
 * @ACCESS login user only  {{url}}/api/v1/user/me
 */

export const getLoggedInUserDetails = asyncHandler(async (req, res, next) => {
  const { id } = req.user;

  if (!id) {
    return next(new AppError("user not found", 401));
  }

  const user = await User.findById(id);

  if (!user) {
    return next(new AppError("user not found", 401));
  }

  res.status(200).json({
    success: true,
    message: "user details",
    user,
  });
});

/**
 * @FORGOT_PASSWORD
 * @ROUTE @POST
 * @ACCESS public  {{url}}/api/v1/user/reset
 */

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("email is required!", 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError("please enter your email", 401));
  }

  const resetToken = await user.generateForgotPasswordToken();

  const resetTokenLink = `${process.env.FRONT_URL}/reset/password/${resetToken}`;

  try {
    await forgotPasswordMail(email, resetTokenLink);
  } catch (error) {
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;

    return next(new AppError(`email send error: ${error}`, 400));
  }

  await user.save();
  res.status(200).json({
    success: true,
    message: "forgot password request send to user mail",
  });
});

/**
 * @RESET_PASSWORD
 * @ROUTE @POST
 * @ACCESS public {{url}}/api/v1/user/reset/:resetToken
 */

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { password, confirmPassword } = req.body;
  const { resetToken } = req.params;

  if (!password || !confirmPassword) {
    return next(new AppError("password and confirm password is required", 400));
  }

  if (password !== confirmPassword) {
    return next(
      new AppError("password and confirm password are not match", 400)
    );
  }

  const forgotPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("invalid user or token is expire", 400));
  }

  user.password = password;

  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "password reset successfully",
  });
});

/**
 * @CHANGE_PASSWORD
 * @ROUTE @POST
 * @ACCESS  logged in user only  {{url}}/api/v1/user/change-password
 */

export const changePassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const { id } = req.user;

  if (!oldPassword || !newPassword) {
    return next(new AppError("all field are required", 400));
  }

  if (oldPassword == newPassword) {
    return next(new AppError("new password match old password", 400));
  }

  const user = await User.findById(id).select("+password");

  const verifyPassword = await user.comparePassword(oldPassword);

  if (!verifyPassword) {
    return next(new AppError("old password not metch", 400));
  }

  user.password = newPassword;
  await user.save();

  user.password = undefined;

  res.status(200).json({
    success: true,
    message: "password changed successfully",
  });
});

/**
 * @UPDATE_PROFILE
 * @ROUTE @POST
 * @ACCESS  logged in user only  {{url}}/api/v1/user/me
 */

export const updateProfile = asyncHandler(async (req, res, next) => {
  const { id } = req.user;

  const user = await User.findById(id);

  if (!user) {
    if (req.file) fs.rmSync(`uploads/${req.file.filename}`);
    return next(new AppError("user not exist on this id", 400));
  }

  for (const key in req.body) {
    if (key in user) {
      user[key] = req.body[key];
    }
  }

  if (req.file) {
    try {
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);

      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "lms",
        width: 200,
        height: 200,
        crop: "fill",
        gravity: "faces",
      });

      if (result) {
        user.avatar.public_id = result.public_id;
        user.avatar.secure_url = result.secure_url;

        fs.rmSync(`uploads/${req.file.filename}`);
      }
    } catch (error) {
      for (const file of fs.readdir("uploads/")) {
        fs.rmSync(`uploads/${file}`);
      }
      return next(new AppError("updating profile avatar error: " + error, 400));
    }
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "profile updated successfully",
    user,
  });
});
