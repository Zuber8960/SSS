const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Base upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const LORRY_DIR = path.join(UPLOAD_DIR, 'lorry');

// Ensure directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
ensureDir(LORRY_DIR);

// Multer storage configuration for lorry documents
const lorryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, LORRY_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `lorry-${uniqueSuffix}${ext}`);
  }
});

// File filter – allow only images and PDFs
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname || mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images, PDFs, and documents are allowed'));
  }
};

const upload = multer({
  storage: lorryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter: fileFilter
});

module.exports = upload;