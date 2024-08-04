import multer from "multer";
import path from "path";

export const upload = multer({
  dest: "uploads/",
  limits: { fieldSize: 5 * 1024 * 1024 },
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (_req, file, cb) => {
      cb(null, file.originalname);
    },
  }),
  fileFilter: (_req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();

    if (
      ext !== ".jpg" &&
      ext !== ".jpeg" &&
      ext !== ".png" &&
      ext !== ".mp4" &&
      ext !== ".webp"
    ) {
      return cb(new Error("unsupported file type " + ext), false);
    }

    cb(null, true);
  },
});
