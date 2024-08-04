import { Schema, model } from "mongoose";

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "title is required"],
      minLength: [5, "title must be  atleast 5 character long"],
      maxLength: [50, "title should be less than 50 character"],
      unique: [true, "title is already given"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "description is required"],
      minLength: [8, "description must be  atleast 8 character long"],
      maxLength: [500, "description should be less than 500 character"],    
    },
    createdBy: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: [true, "category is required"],
    },
    price: {
      type: Number,
      required: true,
    },
    expiry: {
      type: Number,
      required: true,
    },
    numberOfLectures: {
      type: Number,
      default: 0,
    },
    thumbnail: {
      public_id: {
        type: String,
        required: true,
      },
      secure_url: {
        type: String,
        required: true,
      },
    },
    lectures: [
      {
        name: String,
        description: String,
        lecture: {
          public_id: String,
          secure_url: String,
        },
      },
    ],
  },
  {
    timeseries: true,
  }
);

const Course = model("Course", courseSchema);

export default Course;
