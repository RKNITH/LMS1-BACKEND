import { Schema, model } from "mongoose";

const myCourseSchema = new Schema(
  {
    userId: {
      type: String,
      required: [true, "user id is required to store user course progress"],
      unique: [true, "user id must be unique"],
    },
    myPurchasedCourses: [
      {
        courseId: {
          type: String,
          required: true,
        },
        lectureProgress: [
          {
            lectureId: {
              type: String,
              required: true,
            },
            marked: {
              type: Boolean,
              default: false,
            },
            notes: [
              {
                type: String,
                maxlength: [200, "write note less than 200 character"],
                trim: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const MyCourse = model("MyCourse", myCourseSchema);

export default MyCourse;
