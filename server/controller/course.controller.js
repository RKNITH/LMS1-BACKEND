import cloudinary from "cloudinary";
import fs from "fs";
import Course from "../models/course.model.js";
import asyncHandler from "../middleware/asyncHandler.middleware.js";
import AppError from "../utils/error.utils.js";

/**
 * @CREATE_COURSE
 * @ROUTE @POST
 * @ACCESS admin {{url}}/api/v1/courses/
 */

export const createCourse = asyncHandler(async (req, res, next) => {
  const { title, description, createdBy, category, price, expiry } = req.body;

  if (!title || !description || !createdBy || !category || !price || !expiry) {
    if (req.file) fs.rmSync(`uploads/${req.file.filename}`);
    return next(new AppError("all fields are required", 400));
  }

  const isCourseExist = await Course.findOne({ title });
  if (isCourseExist) {
    if (req.file) fs.rmSync(`uploads/${req.file.filename}`);
    return next(new AppError("title is already used in another course", 400));
  }

  const course = await Course.create({
    title,
    description,
    createdBy,
    category,
    price,
    expiry, // expiry in months
    thumbnail: {
      public_id: title,
      secure_url:
        "https://www.careerguide.com/career/wp-content/uploads/2020/01/coding-programming-working-macbook-royalty-free-thumbnail.jpg",
    },
  });

  if (!course) {
    return next(new AppError("course in not created. please try again", 400));
  }

  if (req.file) {
    try {
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "lms",
        width: 250,
        height: 200,
      });

      if (result) {
        course.thumbnail.public_id = result.public_id;
        course.thumbnail.secure_url = result.secure_url;
      }

      fs.rmSync(`uploads/${req.file.filename}`);
    } catch (error) {
      for (const file in await fs.readdir(`uploads/`)) {
        await fs.rmSync(`uploads/${file}`);
      }
      return next(new AppError("course thumbnail is not uploaded", 400));
    }
  }

  await course.save();

  res.status(200).json({
    success: true,
    message: "course created successfully",
    course,
  });
});

/**
 * @GET_ALL_COURSES
 * @ROUTE @GET
 * @ACCESS public {{url}}/api/v1/courses
 */

export const getAllCourses = asyncHandler(async (req, res, next) => {
  const query = req.query;

  let courses = [];
  if (Object.keys(query).length !== 0) {
    let categories = query.category.split(",");
    let instructors = query.instructor.split(",");

    courses = await Course.find({
      $and: [
        { category: { $in: categories } },
        { createdBy: { $in: instructors } },
      ],
    }).select("-lectures");
  } else {
    courses = await Course.find().select("-lectures");
  }

  if (!courses) {
    return next(new AppError("courses not found", 400));
  }

  res.status(200).json({
    success: true,
    message: "course get successfully",
    courses,
  });
});

/**
 * @UPDATE_COURSE
 * @ROUTE @PUT
 * @ACCESS admin {{url}}/api/v1/courses/?courseId='
 */

export const updateCourse = asyncHandler(async (req, res, next) => {
  const { courseId } = req.query;

  const course = await Course.findById(courseId).select("-lectures");

  for (const key in req.body) {
    if (key in course) {
      course[key] = req.body[key];
    }
  }

  if (req.file) {
    try {
      await cloudinary.v2.uploader.destroy(course.thumbnail.public_id);

      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "lms",
        width: 250,
        height: 200,
      });

      if (result) {
        course.thumbnail.public_id = result.public_id;
        course.thumbnail.secure_url = result.secure_url;
      }

      fs.rmSync(`uploads/${req.file.filename}`);
    } catch (error) {
      for (const file of fs.readdir(`uploads/`)) {
        fs.rmSync(`uploads/${file}`);
      }
    }
  }

  await course.save();

  res.status(200).json({
    success: true,
    message: "course updated successfully",
    course,
  });
});

/**
 * @DELETE_COURSE
 * @ROUTE @DELETE
 * @ACCESS admin {{url}}/api/v1/courses/?courseId='
 */

export const deleteCourse = asyncHandler(async (req, res, next) => {
  const { courseId } = req.query;

  const course = await Course.findByIdAndDelete(courseId);

  if (!course) {
    return next(new AppError("course not found on this id", 400));
  }

  await cloudinary.v2.uploader.destroy(course.thumbnail.public_id);

  res.status(200).json({
    success: true,
    message: "course deleted successfully",
  });
});

/**
 * @GET_LECTURES_BY_COURSE_ID
 * @ROUTE @GET
 * @ACCESS admin {{url}}/api/v1/courses/:courseId
 */

export const getLecturesByCourseId = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);

  if (!course) {
    return next(new AppError("course not found on this id", 400));
  }

  res.status(200).json({
    success: true,
    message: "course lectures fetch successfully",
    lectures: course.lectures,
    title: course.title,
  });
});

/**
 * @ADD_LECTURE_INTO_COURSE_BY_ID
 * @ROUTE @POST
 * @ACCESS admin {{url}}/api/v1/courses/:courseId
 */

export const addLectureIntoCourseById = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const { name, description } = req.body;

  if (!name || !description || !req.file) {
    if (req.file) fs.rmSync(`uploads/${req.file.filename}`);
    return next(new AppError("all fields are required", 400));
  }

  const lectureData = {
    name,
    description,
    lecture: {},
  };

  if (req.file) {
    try {
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "lms",
        chunk_size: 2000000,
        resource_type: "video",
      });

      if (result) {
        lectureData.lecture.public_id = result.public_id;
        lectureData.lecture.secure_url = result.secure_url;
      }

      fs.rmSync(`uploads/${req.file.filename}`);
    } catch (error) {
      fs.rmSync(`uploads/${req.file.filename}`);
    }
  }

  await Course.updateOne(
    { _id: courseId },
    {
      $addToSet: {
        lectures: lectureData,
      },
      $inc: {
        numberOfLectures: 1
      }
    }
  );

  res.status(200).json({
    success: true,
    message: "lecture added to course successfully",
  });
});

/**
 * @UPDATE_LECTURE_FROM_COURSE_BY_ID
 * @ROUTE @PUT
 * @ACCESS admin {{url}}/api/v1/courses/:courseId?lectureId=''
 */

export const updateLectureIntoCourseById = asyncHandler(
  async (req, res, next) => {
    const { courseId } = req.params;
    const { lectureId } = req.query;

    if (!courseId || !lectureId) {
      if (req.file) fs.rmSync(`uploads/${req.file.filename}`);
      return next(new AppError("course id or lecture id is not found", 400));
    }

    const lectureData = await Course.findOne(
      { _id: courseId },
      { lectures: { $elemMatch: { _id: lectureId } } }
    );

    lectureData.lectures[0] = {
      ...req.body,
      lecture: { ...lectureData.lectures[0].lecture },
    };

    if (req.file) {
      try {
        if (lectureData.lectures[0].lecture.public_id) {
          await cloudinary.v2.uploader.destroy(
            lectureData.lectures[0].lecture.public_id,
            { resource_type: "video" }
          );
        }

        const result = await cloudinary.v2.uploader.upload(req.file.path, {
          folder: "lms",
          chunk_size: 2000000,
          resource_type: "video",
        });

        if (result) {
          lectureData.lectures[0].lecture = {
            public_id: result.public_id,
            secure_url: result.secure_url,
          };
        }

        fs.rmSync(`uploads/${req.file.filename}`);
      } catch (error) {
        fs.rmSync(`uploads/${req.file.filename}`);
      }
    }

    await lectureData.save();

    res.status(200).json({
      success: true,
      message: "lecture updated successfuly",
    });
  }
);

/**
 * @REMOVE_LECTURE_FROM_COURSE_BY_ID
 * @ROUTE @DELETE
 * @ACCESS admin {{url}}/api/v1/courses/:courseId?lectureId=''
 */

export const removeLectureFromCourseById = asyncHandler(
  async (req, res, next) => {
    const { courseId } = req.params;
    const { lectureId } = req.query;

    if (!courseId || !lectureId) {
      return next(new AppError("course id or lecture is does not found", 400));
    }

    const lectureData = await Course.findOne(
      { _id: courseId },
      {
        lectures: {
          $elemMatch: { _id: lectureId }
        }
      }
    )
    
    if(lectureData.lectures[0].lecture) {
      await cloudinary.v2.uploader.destroy(
        lectureData.lectures[0].lecture.public_id,
        { resource_type: "video" }
      );
    }

    await Course.findOneAndUpdate(
      { _id: courseId },
      {
        $pull: {
          lectures: { _id: lectureId }
        },
        $inc: {
          numberOfLectures: -1
        }
      }
    )

    res.status(200).json({
      success: true,
      message: "lecture is successfully remove from this course",
    });
  }
);

/**
 * @GET_FILTER_LIST
 * @ROUTE @GET
 * @ACCESS public {{url}}/api/v1/course/filters
 */

export const getFilterList = asyncHandler(async (req, res, next) => {
  const filterList = await Course.aggregate([
    { 
      $group: {
        _id: null,
        categories: {
          $addToSet: "$category"
        },
        instructors: {
          $addToSet: "$createdBy"
        }
      }
    },
    {
      $project: {
        _id: 0
      }
    }
  ])

  res.status(200).json(filterList[0]);
});
