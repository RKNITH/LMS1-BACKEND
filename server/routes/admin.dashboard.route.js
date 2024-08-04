import { Router } from "express";
const router = Router();
import { authorizedRoles, isLoggedIn } from "../middleware/auth.middleware.js";
import {
  getCoursesSellByUser,
  getCoursesSellByCourse,
} from "../controller/admin.dashboard.controller.js";

router
  .route("/courses-sell-by-user")
  .get(isLoggedIn, authorizedRoles("ADMIN"), getCoursesSellByUser);

router
  .route("/courses-sell-by-course")
  .get(isLoggedIn, authorizedRoles("ADMIN"), getCoursesSellByCourse);

export default router;
