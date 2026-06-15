const huggingfaceService = require('../services/huggingfaceService');
const nerParserService = require('../services/nerParserService');
const menuMatchService = require('../services/menuMatchService');
const billingService = require('../services/billingService');

const GST_RATE = parseFloat(process.env.GST_RATE || '0.05');

/**
 * Core pipeline shared by both voice and text routes.
 * Accepts a plain transcript string, runs translation + NER + matching + billing.
 */
const runTextPipeline = async (transcript) => {
  // STEP 4: Translate to English (graceful fallback)
  let translatedText = transcript;
  try {
    translatedText = await huggingfaceService.translateToEnglish(transcript);
  } catch (err) {
    console.warn('[AI] Translation skipped:', err.message);
  }

  // STEP 5: NER entity extraction (graceful fallback to text splitting)
  let entities = [];
  try {
    entities = await huggingfaceService.extractEntities(translatedText);
  } catch (err) {
    console.warn('[AI] NER skipped:', err.message);
  }

  const parsedItems = nerParserService.parseEntitiesWithQty(entities, translatedText);

  if (parsedItems.length === 0) {
    return { error: `No food items found in: "${translatedText}". Say item names clearly e.g. "two paneer butter masala"` };
  }

  const { resolved, notFound, unavailable } = await menuMatchService.matchItemsToMenu(parsedItems);
  const billing = billingService.calculateBill(resolved, GST_RATE);

  return {
    transcript,
    translatedText,
    extractedEntities: parsedItems,
    resolvedItems: resolved,
    notFound,
    unavailable,
    billing
  };
};

/**
 * POST /api/ai/process-voice
 * Accepts multipart audio. Tries HF Whisper, falls back to browserTranscript.
 */
exports.processVoiceOrder = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio recording provided' });
    }

    const browserTranscript = (req.body.browserTranscript || '').trim();
    const audioBuffer = req.file.buffer;

    let transcript = '';

    // Try HF Whisper — if unavailable, use browser transcript
    const cleanedAudio = await huggingfaceService.enhanceAudio(audioBuffer);
    try {
      transcript = await huggingfaceService.transcribeAudio(cleanedAudio);
    } catch (whisperErr) {
      console.warn('[AI] Whisper unavailable, using browser transcript:', whisperErr.message);
      transcript = browserTranscript;
    }

    if (!transcript) {
      return res.status(422).json({
        success: false,
        error: 'No speech detected. Please speak clearly and try again.'
      });
    }

    const result = await runTextPipeline(transcript);
    if (result.error) return res.status(422).json({ success: false, error: result.error });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/ai/process-text
 * Primary fast path — accepts plain text, skips audio/Whisper entirely.
 * Used when browser SpeechRecognition has already captured the transcript.
 */
exports.processTextOrder = async (req, res, next) => {
  try {
    const transcript = (req.body.text || '').trim();

    if (!transcript) {
      return res.status(400).json({ success: false, error: 'text field is required' });
    }

    const result = await runTextPipeline(transcript);
    if (result.error) return res.status(422).json({ success: false, error: result.error });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
