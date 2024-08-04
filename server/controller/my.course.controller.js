import MyCourse from "../models/my.course.model.js";
import Payment from "../models/payment.model.js";
import asyncHandler from "../middleware/asyncHandler.middleware.js";
import AppError from "../utils/error.utils.js";

/**
 * @GET_MY_COURSE_LIST
 * @ROUTE @GET
 * @ACCESS course purchased user only {{url}}/api/v1/my-courses
 */

export const getMyAllCourses = asyncHandler(async (req, res, next) => {
  const { id } = req.user;

  const myPurchasedCourseList = await Payment.aggregate([
    {
      $match: {
        userId: id,
      },
    },
    {
      $unwind: "$purchasedCourse",
    },
    {
      $project: {
        _id: 0,
        courseId: {
          $toObjectId: "$purchasedCourse.courseId",
        },
      },
    },
    {
      $lookup: {
        from: "courses",
        localField: "courseId",
        foreignField: "_id",
        as: "purchasedCourses",
        pipeline: [
          {
            $project: {
              title: 1,
              thumbnail: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        purchasedCourses: {
          $first: "$purchasedCourses",
        },
      },
    },
    {
      $group: {
        _id: null,
        courseList: {
          $push: "$purchasedCourses",
        },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    courseList: myPurchasedCourseList[0]?.courseList || [],
  });
});

/**
 * @GET_MY_COURSE_LECTURE_PROGRESS
 * @ROUTE @GET
 * @ACCESS course purchased user only {{url}}/api/v1/my-courses/:courseId
 */

export const getMyCourseLectureProgress = asyncHandler(
  async (req, res, next) => {
    const { id } = req.user;
    const { courseId } = req.params;

    const myCourseProgress = await MyCourse.findOne(
      { userId: id },
      {
        myPurchasedCourses: {
          $elemMatch: {
            courseId: courseId,
          },
        },
      }
    );

    res.status(200).json({
      success: true,
      courseProgress: myCourseProgress.myPurchasedCourses[0],
    });
  }
);

/**
 * @ADD_NOTE_INTO_LECTURE
 * @ROUTE @POST
 * @ACCESS course purchased user only {{url}}/api/v1/my-courses/:courseId/:lectureId
 */

export const addNote = asyncHandler(async (req, res, next) => {
  const { id } = req.user;
  const { note } = req.body;
  const { courseId } = req.params;
  const { lectureId } = req.query;

  const myCourse = await MyCourse.findOneAndUpdate(
    {
      userId: id,
      "myPurchasedCourses.courseId": courseId,
    },
    {
      $addToSet: {
        "myPurchasedCourses.$[elem].lectureProgress.$[subElem].notes": note,
      },
    },
    {
      arrayFilters: [
        { "elem.courseId": courseId },
        { "subElem.lectureId": lectureId },
      ],
      upsert: true,
      new: true,
    }
  );

  const courseIndex = myCourse.myPurchasedCourses.findIndex(
    (item) => item.courseId === courseId
  );

  const lectureIndex = myCourse.myPurchasedCourses[
    courseIndex
  ].lectureProgress.findIndex((item) => item.lectureId === lectureId);

  if (lectureIndex === -1) {
    myCourse.myPurchasedCourses[courseIndex].lectureProgress.push({
      lectureId,
      notes: [note],
    });

    await myCourse.save();
  }

  res.status(200).json({
    success: true,
    message: "note added successfully",
  });
});

/**
 * @UPDATE_LECTURE_CHECK_MARK
 * @ROUTE @PUT
 * @ACCESS course purchased user only {{url}}/api/v1/my-courses/:courseId/:lectureId
 */

export const updateLectureMark = asyncHandler(async (req, res, next) => {
  const { id } = req.user;
  const { checked } = req.body;
  const { courseId } = req.params;
  const { lectureId } = req.query;

  const myCourse = await MyCourse.findOneAndUpdate(
    {
      userId: id,
      "myPurchasedCourses.courseId": courseId,
    },
    {
      $set: {
        "myPurchasedCourses.$[elem].lectureProgress.$[subElem].marked": checked,
      },
    },
    {
      arrayFilters: [
        { "elem.courseId": courseId },
        { "subElem.lectureId": lectureId },
      ],
      upsert: true,
      new: true,
    }
  );

  const courseIndex = myCourse.myPurchasedCourses.findIndex(
    (item) => item.courseId === courseId
  );

  const lectureIndex = myCourse.myPurchasedCourses[
    courseIndex
  ].lectureProgress.findIndex((item) => item.lectureId === lectureId);

  if (lectureIndex === -1) {
    myCourse.myPurchasedCourses[courseIndex].lectureProgress.push({
      lectureId,
      marked: checked,
    });

    await myCourse.save();
  }

  res.status(200).json({
    success: true,
    message: `lecture ${checked ? "marked" : "unmarked"}`,
  });
});

/**
 * @DELETE_LECTURE_CHECK_MARK
 * @ROUTE @DELETE
 * @ACCESS course purchased user only {{url}}/api/v1/my-courses/:courseId/:lectureId
 */

export const deleteNote = asyncHandler(async (req, res, next) => {
  const { id } = req.user;
  const { noteIndex } = req.body;
  const { lectureId } = req.query;
  const { courseId } = req.params;

  const myCourse = await MyCourse.findOne(
    { userId: id },
    {
      myPurchasedCourses: {
        $elemMatch: {
          courseId: courseId,
        },
      },
    }
  );

  const lectureIndex = myCourse.myPurchasedCourses[0].lectureProgress.findIndex(
    (item) => item.lectureId === lectureId
  );

  if (lectureIndex === -1) {
    return next(new AppError(`you don't have access to this course`, 400));
  }

  if (
    !myCourse.myPurchasedCourses[0].lectureProgress[lectureIndex].notes[
      noteIndex
    ]
  ) {
    return next(new AppError(`no note found on this note index`, 400));
  }

  myCourse.myPurchasedCourses[0].lectureProgress[lectureIndex].notes.splice(
    noteIndex,
    1
  );

  myCourse.save();

  res.status(200).json({
    success: true,
    message: "notes removed from lecture progress",
  });
});
