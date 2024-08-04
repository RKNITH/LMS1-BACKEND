import nodemailer from "nodemailer";
import AppError from "./error.utils.js";

async function mail(email, subject, message) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const options = {
    from: "ravi@gmail.com",
    to: email,
    subject,
    html: message,
  };

  await transporter.sendMail(options, (err, info) => {
    if (err) {
      return next(new AppError("mail error: " + err, 400));
    }
  });
}

export const registerMail = async (email) => {
  let subject = "🎉 Registration Complete! Welcome to LMS";
  let message = "<h1>welcome to LMS</h1>";

  mail(email, subject, message);
};

export const forgotPasswordMail = async (email, link) => {
  let subject = "Password reset requested";
  let message = link;

  mail(email, subject, message);
};

export const coursePurchasingMail = async (email, details) => {
  let subject = `thank yu for purchasing ${details.courseName} course`;
  let message = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <style>
          * {
            margin: 0;
            font-family: Verdana, Geneva, Tahoma, sans-serif;
          }

          div {
            margin-left: 20px;
          }

          p {
            margin-bottom: 10px;
            padding-left: 5px;
            font-size: 17px;
          }

          p span {
            color: orangered;
            font-weight: bold;
          }

          a {
            text-decoration: none;
            cursor: pointer;
            padding: 5px 12px;
            background: lightgreen;
            border-radius: 5px;
            margin-left: 50px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <p>course: ${details.courseName}</p>
          <p>Course Access: ${details.courseExpiry} months</p>
          <p>order id: ${details.orderId}</p>
          <p>payment id: ${details.paymentId}</p>
          <p>total price: ${details.coursePrice}₹</p>

          <a href="${details.courseLink}">start learning</a>
        </div>
      </body>
    </html>`;

  mail(email, subject, message);
};
