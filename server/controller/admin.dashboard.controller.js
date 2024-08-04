import User from "../models/user.model.js";
import Course from "../models/course.model.js";
import MyCourse from "../models/my.course.model.js";
import Payment from "../models/payment.model.js";
import asyncHandler from "../middleware/asyncHandler.middleware.js";
import AppError from "../utils/error.utils.js";

/**
 * @COURSE_SELL_BY_USER
 * @ROUTE @GET
 * @ACCESS adimn only {{url}}/api/v1/admin/dashboard
 */

export const getCoursesSellByUser = asyncHandler(async (req, res, next) => {
  const user = await User.find();
  const payment = await Payment.find();
  const course = await Course.find().select("-lectures");

  const totalUsers = user.length;

  const userCourses = [];

  payment.map((p) => {
    const userInfo = {
      userId: p.userId,
      purchasedCourses: [],
    };
    user.map((u) => {
      if (u._id.toString() === p.userId) {
        userInfo.email = u.email;
        userInfo.name = u.name;
        userInfo.avatar = u.avatar.secure_url;
      }
    });
    p.purchasedCourse.map((c) => {
      c.purchaseDetails.map((item) => {
        if (item.expirationDate > Date.now()) {
          course.map((co) => {
            if (co._id.toString() === c.courseId) {
              userInfo.purchasedCourses.push({
                courseId: c.courseId,
                courseTitle: co.title,
                purchaseDate: item.purchaseDate,
                exiprationDate: item.expirationDate,
              });
            }
          });
        }
      });
    });
    userCourses.push(userInfo);
  });

  res.status(200).json({
    success: true,
    message: "get all users info",
    totalUsers,
    userCourses,
  });
});

/**
 * @COURSE_SELL_BY_COURSE
 * @ROUTE @GET
 * @ACCESS adimn only {{url}}/api/v1/admin/dashboard
 */

export const getCoursesSellByCourse = asyncHandler(async (req, res, next) => {
  const payment = await Payment.find();
  const course = await Course.find();

  const totalCourses = course.length;

  const sellCourses = [];

  course.map((c) => {
    const courseInfo = {
      _id: c._id,
      price: c.price,
      title: c.title,
      description: c.description,
      category: c.category,
      createdBy: c.createdBy,
      expiry: c.expiry,
      numberOfLectures: c.numberOfLectures,
      thumbnail: c.thumbnail,
      purchasedCourseByUser: 0,
    };

    payment.map((p) => {
      p.purchasedCourse.map((item) => {
        if (item.courseId === c._id.toString()) {
          item.purchaseDetails.map((i) => {
            if (i.expirationDate > Date.now()) {
              courseInfo.purchasedCourseByUser++;
            }
          });
        }
      });
    });
    sellCourses.push(courseInfo);
  });

  res.status(200).json({
    success: true,
    message: "get all course info",
    totalCourses,
    course: sellCourses,
  });
});
