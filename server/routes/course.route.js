import { Router } from "express";
const router = Router();
import {
  authorizedRoles,
  isLoggedIn,
  isPurchasedCourse,
} from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import {
  addLectureIntoCourseById,
  createCourse,
  deleteCourse,
  getAllCourses,
  getLecturesByCourseId,
  removeLectureFromCourseById,
  updateCourse,
  updateLectureIntoCourseById,
  getFilterList
} from "../controller/course.controller.js";


router
  .route('/filters')
  .get(getFilterList)

router
  .route("/")
  .get(getAllCourses)
  .post(
    isLoggedIn,
    authorizedRoles("ADMIN"),
    upload.single("thumbnail"),
    createCourse
  )
  .put(
    isLoggedIn,
    authorizedRoles("ADMIN"),
    upload.single("thumbnail"),
    updateCourse
  )
  .delete(isLoggedIn, authorizedRoles("ADMIN"), deleteCourse);

router
  .route("/:courseId")
  .get(isLoggedIn, isPurchasedCourse, getLecturesByCourseId)
  .post(
    isLoggedIn,
    authorizedRoles("ADMIN"),
    upload.single("lecture"),
    addLectureIntoCourseById
  )
  .put(
    isLoggedIn,
    authorizedRoles("ADMIN"),
    upload.single("lecture"),
    updateLectureIntoCourseById
  )
  .delete(isLoggedIn, authorizedRoles("ADMIN"), removeLectureFromCourseById);

export default router;
