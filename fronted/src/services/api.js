// src/services/api.js

// FIX: BASE_URL always reads from VITE_API_URL env variable — no hardcoded URLs.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API Request Failed');
  }

  return data;
}

export const fetchMenu = () => apiRequest('GET', '/api/menu');

/**
 * Sends audio blob to the backend AI pipeline.
 *
 * FIX: File extension is derived from the blob's actual MIME type so the
 *      filename extension matches what the browser recorded:
 *        audio/webm → recording.webm  (Chrome/Edge)
 *        audio/ogg  → recording.ogg   (Firefox)
 *        audio/mp4  → recording.mp4   (Safari)
 *      Multer on the backend identifies the file by fieldname "audio", so even
 *      application/octet-stream blobs are accepted.
 *
 * FIX: Do NOT manually set Content-Type header when sending FormData — the browser
 *      must set it automatically so the correct multipart boundary is included.
 *      Without the boundary, multer cannot parse the upload and req.file is undefined.
 */
export const processVoice = async (audioBlob, browserTranscript = '') => {
  const formData = new FormData();

  // Derive extension from MIME type for a correct filename hint to multer
  const mime = audioBlob?.type || '';
  const extension =
    mime.includes('ogg')  ? 'ogg'  :
    mime.includes('mp4')  ? 'mp4'  :
    mime.includes('mpeg') ? 'mp3'  :
    mime.includes('wav')  ? 'wav'  :
    'webm'; // default — Chrome/Edge

  formData.append('audio', audioBlob, `recording.${extension}`);
  formData.append('browserTranscript', browserTranscript);

  // Do NOT pass headers object — let browser set Content-Type + boundary automatically
  const response = await fetch(`${BASE_URL}/api/ai/process-voice`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'AI Processing Failed');
  return data;
};

/**
 * Faster path: skip audio upload/Whisper — send browser transcript text directly.
 * Used when browser SpeechRecognition has already captured the transcript.
 */
export const processText = async (text) => {
  const response = await fetch(`${BASE_URL}/api/ai/process-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Text Processing Failed');
  return data;
};

export const submitOrder = (payload) => apiRequest('POST', '/api/orders', payload);

export const fetchOrders = (params) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest('GET', `/api/orders?${query}`);
};

export const fetchOrderById = (id) => apiRequest('GET', `/api/orders/${id}`);

export const updateStatus = (id, status) => apiRequest('PATCH', `/api/orders/${id}/status`, { status });

export const cancelOrder = (id) => apiRequest('DELETE', `/api/orders/${id}`);
