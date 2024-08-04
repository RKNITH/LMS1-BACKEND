import AppError from "../utils/error.utils.js";

const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(new AppError(err, 400)));
  };
};

export default asyncHandler;
