import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";
import Course from "../models/course.model.js";
import MyCourse from "../models/my.course.model.js";
import { stripe } from "../app.js";
import asyncHandler from "../middleware/asyncHandler.middleware.js";
import AppError from "../utils/error.utils.js";
import { coursePurchasingMail } from "../utils/mail.utils.js";

/**
 * @CHECKOUT
 * @ROUTR @POST
 * @ACCESS login user only {{url}}/api/v1/checkout
 */

export const checkout = asyncHandler(async (req, res, next) => {
  const { amount, title, courseId } = req.body;
  const { id } = req.user;

  const payment = await Payment.findOne({ userId: id });

  if (!payment) {
    const payment = await Payment.create({
      userId: id,
      purchasedCourses: [],
    });
    await payment.save();
  } else {
    const courseIndex = payment.purchasedCourse.findIndex(
      (item) => item.courseId === courseId
    );

    if (courseIndex !== -1) {
      const isPurchased = payment.purchasedCourse[
        courseIndex
      ].purchaseDetails.find((detail) => detail.expirationDate > Date.now());

      if (isPurchased) {
        return next(
          new AppError("you have already purchased this course", 502)
        );
      }
    }
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "INR",
          product_data: {
            name: title,
          },
          unit_amount: amount * 100,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONT_URL}/payment/success?courseId=${courseId}`,
    cancel_url: `${process.env.FRONT_URL}/payment/failure`,
  });

  res.status(200).json({ url: session.url });
});

/**
 * @VERIFY
 * @ROUTE @POST
 * @ACCESS login user only {{url}}/api/v1/payment/verify?courseId=''
 */

export const verify = asyncHandler(async (req, res, next) => {
  const { id } = req.user;
  const { courseId } = req.query;

  const course = await Course.findById(courseId).select("-lectures");
  const user = await User.findById(id);
  const myCourse = await MyCourse.findOne({ userId: id });

  if (!course || !user) {
    return next(new AppError("user or course does not exist.", 400));
  }

  if (user.role === "ADMIN") {
    return next(new AppError("admin cannot purchas course", 502));
  }

  const payment = await Payment.findOne({ userId: id });

  if (!payment) {
    return next(new AppError("create order before verify the payment", 400));
  }

  const details = {
    purchaseDate: Date.now(),
    expirationDate: Date.now() + course.expiry * 30 * 24 * 60 * 60 * 1000,
  };

  const courseIndex = payment.purchasedCourse.findIndex(
    (item) => item.courseId === courseId
  );

  if (courseIndex === -1) {
    payment.purchasedCourse.push({
      courseId,
      purchaseDetails: details,
    });
  } else {
    const isUserAlreadyPurchased = payment.purchasedCourse[
      courseIndex
    ].purchaseDetails.find((detail) => detail.expirationDate > Date.now());

    if (isUserAlreadyPurchased) {
      return next(new AppError("you already purchased this course", 502));
    } else {
      payment.purchasedCourse[courseIndex].purchaseDetails.push(details);
    }
  }

  coursePurchasingMail(user.email, {
    courseName: course.title,
    courseExpiry: course.expiry,
    coursePrice: course.price,
    courseLink: `${process.env.FRONT_URL}/course/${courseId}`,
  });

  myCourse.myPurchasedCourses.push({
    courseId,
    lectureProgress: [],
  });

  await payment.save();
  await myCourse.save();

  res.status(200).json({ success: true });
});
