import multer from "multer";
import fs from "fs";
import path from "path";

const fileFilter = (_req, file, cb) => {
  if (/^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error("الصورة يجب أن تكون JPG/PNG/WEBP"));
};

// مصنع رفع صور — مجلد لكل نوع
function imageUploader(dir, prefix) {
  fs.mkdirSync(dir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const id = req.user?.id || "x";
      cb(null, `${prefix}${id}_${Date.now()}${ext}`);
    },
  });
  return multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });
}

export const avatarUpload = imageUploader("uploads/avatars", "u");
export const categoryUpload = imageUploader("uploads/categories", "c");
export const eventUpload = imageUploader("uploads/events", "e");
export const venueUpload = imageUploader("uploads/venues", "v");
