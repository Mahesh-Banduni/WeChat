import multer from 'multer';
import path from 'path';
import { BadRequestError } from '../errors/errors.js';

// Define allowed extensions
const allowedExtensions = {
  images: ['.jpg', '.jpeg', '.png'],
  video: ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip'],
};

// Field size limits
const fieldSizeLimits = {
  images: 10 * 1024 * 1024,       // per image
  video: 100 * 1024 * 1024, // 100 MB
  documents: 20 * 1024 * 1024,     // 20 MB per doc
};

const storage = multer.memoryStorage();

// Custom file filter by field and extension
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const field = file.fieldname;

  let allowed = [];

  if (['images'].includes(field)) {
    allowed = allowedExtensions.images;
  } else if (field === 'video') {
    allowed = allowedExtensions.video;
  } else if (field === 'documents') {
    allowed = allowedExtensions.documents;
  } else {
    return cb(new BadRequestError(400, `Unexpected field: ${field}`), false);
  }

  if (!allowed.includes(ext)) {
    return cb(
      new BadRequestError(400, `Invalid file type for ${field}. Allowed: ${allowed.join(', ')}`),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // Global max (needed for video)
});

const combinedFields = [
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 },
  { name: 'documents', maxCount: 10 },
];

// Middleware
export const handleUpload = (req, res, next) => {
  upload.fields(combinedFields)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ statusCode: 400, message: err.message });
    }
    if (err) {
      return res.status(err.statusCode || 500).json({
        statusCode: err.statusCode || 500,
        message: err.message || 'File upload error',
      });
    }

    // Post-upload per-file size validation
    try {
      const files = req.files || {};
      for (const [field, fileArray] of Object.entries(files)) {
        const maxSize = fieldSizeLimits[field] || 5 * 1024 * 1024; // Default fallback
        fileArray.forEach((file) => {
          if (file.size > maxSize) {
            throw new BadRequestError(
              400,
              `File '${file.originalname}' in '${field}' exceeds limit of ${maxSize / (1024 * 1024)}MB.`
            );
          }
        });
      }
    } catch (fileSizeError) {
      return res.status(fileSizeError.statusCode || 500).json({
        statusCode: fileSizeError.statusCode || 500,
        message: fileSizeError.message || 'File size error',
      });
    }

    next();
  });
};
