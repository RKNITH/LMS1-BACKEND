import { Router } from "express";
const router = Router();
import {
  isLoggedIn,
  isPurchasedCourse,
} from "../middleware/auth.middleware.js";
import {
  addNote,
  deleteNote,
  getMyAllCourses,
  getMyCourseLectureProgress,
  updateLectureMark,
} from "../controller/my.course.controller.js";

router.route("/").get(isLoggedIn, getMyAllCourses);

router
  .route("/:courseId")
  .get(isLoggedIn, isPurchasedCourse, getMyCourseLectureProgress)
  .post(isLoggedIn, isPurchasedCourse, addNote)
  .put(isLoggedIn, isPurchasedCourse, updateLectureMark)
  .delete(isLoggedIn, isPurchasedCourse, deleteNote);

export default router;
