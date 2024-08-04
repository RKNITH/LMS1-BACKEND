import { Schema, model } from "mongoose";

const paymentSchema = new Schema(
  {
    userId: {
      type: String,
      required: [true, "user id is required for payment"],
      unique: [true, "user id must be unique"],
    },
    purchasedCourse: [
      {
        courseId: {
          type: String,
          required: [true, "course id is required for payment"],
        },
        purchaseDetails: [
          {
            purchaseDate: {
              type: Date,
              required: true,
            },
            expirationDate: {
              type: Date,
              required: true,
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Payment = model("Payment", paymentSchema);

export default Payment;
