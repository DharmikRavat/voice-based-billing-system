// middleware/upload.js
const multer = require('multer');

// Store files in memory buffer to pass directly to HuggingFace
const storage = multer.memoryStorage();

// FIX: Accept all browser-generated audio MIME types.
// Browsers send different MIME types per platform:
//   Chrome/Edge: audio/webm or audio/webm;codecs=opus
//   Firefox:     audio/ogg or audio/ogg;codecs=opus
//   Safari/iOS:  audio/mp4 or audio/mpeg
//   Some mobile: application/octet-stream (generic binary)
// FIX: Raised fileSize limit from 15MB to 25MB for longer recordings.
const ALLOWED_MIME_PREFIXES = ['audio/', 'video/'];
const ALLOWED_EXACT_TYPES = ['application/octet-stream'];

const fileFilter = (req, file, cb) => {
  const mime = file.mimetype || '';
  const isAudioVideo = ALLOWED_MIME_PREFIXES.some(prefix => mime.startsWith(prefix));
  const isOctetStream = ALLOWED_EXACT_TYPES.includes(mime);
  // Also accept by field name as a last resort (browser may omit Content-Type)
  const isByFieldName = file.fieldname === 'audio';

  if (isAudioVideo || isOctetStream || isByFieldName) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${mime}. Expected an audio recording.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — covers long recordings
});

module.exports = upload;
