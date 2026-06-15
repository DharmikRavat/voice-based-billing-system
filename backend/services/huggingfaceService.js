// services/huggingfaceService.js
const { HfInference } = require('@huggingface/inference');

const client = new HfInference(process.env.HF_TOKEN);

/**
 * STEP 2: Audio enhancement / noise removal via DCCRNet.
 *
 * FIX: The @huggingface/inference SDK's audioToAudio() returns a Blob, not a Buffer.
 *      We must call .arrayBuffer() on the Blob then wrap in Buffer.from().
 *      Also using native fetch as a fallback since audioToAudio() may not exist in
 *      all SDK versions — this guarantees it works regardless of SDK version.
 * Always falls back to original audio on any error — never blocks the pipeline.
 */
exports.enhanceAudio = async (audioBuffer) => {
  try {
    // Prefer direct fetch — more reliable across SDK versions for audio-to-audio
    const response = await fetch(
      'https://api-inference.huggingface.co/models/JorisCos/DCCRNet_Libri1Mix_enhsingle_16k',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/octet-stream',
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      // 503 = model loading, 404 = wrong endpoint — both are non-fatal
      console.warn(`[HF] DCCRNet returned ${response.status} — skipping enhancement, using raw audio`);
      return audioBuffer;
    }

    const enhanced = Buffer.from(await response.arrayBuffer());
    // Sanity check: enhanced audio must be non-trivially sized
    if (enhanced.length < 1000) {
      console.warn('[HF] DCCRNet returned suspiciously small output — using original audio');
      return audioBuffer;
    }

    console.log('[HF] Audio enhanced via DCCRNet');
    return enhanced;
  } catch (error) {
    console.warn('[HF] enhanceAudio skipped — using original audio:', error.message);
    return audioBuffer; // Always continue — never block pipeline
  }
};

/**
 * STEP 3: Speech-to-text transcription via Whisper.
 *
 * FIX: Added exponential backoff retry for 503 "Model loading" errors.
 *      First wait: 20s, second wait: 40s — HF cold-start can take up to 60s.
 * FIX: Tries multiple models in order so there's always a fallback.
 */
exports.transcribeAudio = async (audioBuffer) => {
  const MODELS = [
    'openai/whisper-base',
    'openai/whisper-small',
    'facebook/wav2vec2-base-960h',
  ];

  for (const model of MODELS) {
    const result = await _transcribeWithRetry(audioBuffer, model);
    if (result) return result;
  }

  throw new Error(
    'Audio transcription failed — all Whisper models unreachable. ' +
    'Check HF_TOKEN permissions at https://hf.co/settings/tokens'
  );
};

/**
 * Internal helper: try one model up to `maxRetries` times with backoff on 503.
 * Returns transcript string on success, null if model is unrecoverable.
 */
async function _transcribeWithRetry(audioBuffer, model, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await client.automaticSpeechRecognition({
        model,
        data: audioBuffer,
      });

      if (result && result.text && result.text.trim()) {
        console.log(`[HF] Transcribed via ${model}: "${result.text.trim()}"`);
        return result.text.trim();
      }
      // Empty text is a soft failure — try next model
      console.warn(`[HF] ${model} returned empty transcript`);
      return null;
    } catch (err) {
      const msg = err.message || '';
      const is503 = msg.includes('503') || msg.toLowerCase().includes('loading') || msg.includes('currently loading');

      if (is503 && attempt < maxRetries - 1) {
        const waitMs = (attempt + 1) * 20_000; // 20s, 40s
        console.log(`[HF] ${model} is loading, retrying in ${waitMs / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      // Non-503 error or final retry — log and give up on this model
      console.warn(`[HF] ${model} failed: ${msg}`);
      return null;
    }
  }
  return null;
}

/**
 * STEP 4: Translation — multilingual → English.
 *
 * FIX: Helsinki translation() returns { translation_text } in some SDK versions
 *      and an Array in others. Added safe Array/object unwrapping.
 * Always falls back to original text on failure.
 */
exports.translateToEnglish = async (text) => {
  if (!text || !text.trim()) return text;
  try {
    const result = await client.translation({
      model: 'Helsinki-NLP/opus-mt-mul-en',
      inputs: text,
    });

    // FIX: Robust unwrapping — handle both array and plain object responses
    let translated = null;
    if (Array.isArray(result)) {
      translated = result[0]?.translation_text;
    } else if (result && typeof result === 'object') {
      translated = result.translation_text;
    } else if (typeof result === 'string') {
      translated = result;
    }

    if (translated && translated.trim()) {
      console.log(`[HF] Translated: "${translated.trim()}"`);
      return translated.trim();
    }
    return text;
  } catch (err) {
    console.warn('[HF] Translation failed, using original text:', err.message);
    return text; // Graceful degradation — still run NER on original text
  }
};

/**
 * STEP 5: Named Entity Recognition — extract food items.
 * Uses dslim/bert-base-NER (freely available on HF serverless inference).
 */
exports.extractEntities = async (text) => {
  if (!text || !text.trim()) return [];
  try {
    const result = await client.tokenClassification({
      model: 'dslim/bert-base-NER',
      inputs: text,
    });
    console.log(`[HF] NER extracted ${result.length} tokens`);
    return result;
  } catch (err) {
    console.warn('[HF] NER extraction failed:', err.message);
    return []; // nerParserService will fall back to text-splitting
  }
};
