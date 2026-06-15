const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const aiController = require('../controllers/aiController');

// POST /api/ai/process-voice — full audio pipeline (Whisper + NER)
router.post('/process-voice', upload.single('audio'), aiController.processVoiceOrder);

// POST /api/ai/process-text — fast text-only pipeline (skips Whisper, uses browser transcript)
router.post('/process-text', aiController.processTextOrder);

module.exports = router;
