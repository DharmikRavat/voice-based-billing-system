import { useState, useRef, useCallback, useEffect } from 'react';

// Chrome has an undocumented ~60s hard limit on Web Speech API sessions, even
// with continuous=true. After 60s it silently fires onend. We proactively
// restart at 55s so the user never notices a gap.
const PROACTIVE_RESTART_MS = 55_000;

// Safety watchdog: if isStartingRef is stuck true for longer than this, force-reset it.
const STARTING_WATCHDOG_MS = 4_000;

// Debounce window — ignore the same phrase if it fires again within this window.
// 800ms is enough to block the re-emit on auto-restart, but short enough that
// a user CAN order the same item again quickly.
const DEBOUNCE_MS = 800;

export function useVoiceRecorder({ onSegmentComplete, lang = 'en-IN' } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [duration,    setDuration]    = useState(0);
  const [status,      setStatus]      = useState('idle'); // idle|listening|reconnecting|error
  const [error,       setError]       = useState(null);

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const recRef         = useRef(null);    // active SpeechRecognition instance
  const isListeningRef = useRef(false);   // master on/off switch
  const isStartingRef  = useRef(false);   // prevents concurrent createAndStart() calls
  const langRef        = useRef(lang);
  const timerRef       = useRef(null);
  const startTimeRef   = useRef(null);
  const restartTmr     = useRef(null);    // scheduled restart timer
  const sessionTmr     = useRef(null);    // proactive 55s session restart timer
  const watchdogTmr    = useRef(null);    // safety watchdog for isStartingRef
  const retryDelayRef  = useRef(300);
  const debounceMap    = useRef({});
  const callbackRef    = useRef(onSegmentComplete);

  useEffect(() => { callbackRef.current = onSegmentComplete; }, [onSegmentComplete]);

  useEffect(() => {
    if (langRef.current === lang) return;
    langRef.current = lang;
    // eslint-disable-next-line no-use-before-define
    if (isListeningRef.current) engineRef.current?.schedule(100);
  }, [lang]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const clearWatchdog = () => {
    clearTimeout(watchdogTmr.current);
    watchdogTmr.current = null;
  };

  const clearRestartTimer = () => {
    clearTimeout(restartTmr.current);
    restartTmr.current = null;
  };

  const clearSessionTimer = () => {
    clearTimeout(sessionTmr.current);
    sessionTmr.current = null;
  };

  /**
   * Kills the active SpeechRecognition instance cleanly.
   * Nulls all handlers first so no cascading events fire.
   * Always resets isStartingRef so the guard can never deadlock.
   */
  const destroyRec = () => {
    clearWatchdog();
    const old = recRef.current;
    recRef.current = null;
    isStartingRef.current = false;
    if (!old) return;
    old.onstart  = null;
    old.onresult = null;
    old.onerror  = null;
    old.onend    = null;
    try { old.abort(); } catch (_) {}
  };

  // Engine ref lets createAndStart and schedule() call each other without circular deps.
  const engineRef = useRef(null);

  // ── Core engine ──────────────────────────────────────────────────────────────
  const createAndStart = useCallback(() => {
    if (!isListeningRef.current) return;
    if (isStartingRef.current)   return; // already starting — prevent double-start

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported. Use Chrome or Edge.');
      setStatus('error');
      return;
    }

    // Kill old instance cleanly before creating a new one.
    destroyRec();
    clearSessionTimer();

    isStartingRef.current = true;

    // Safety watchdog: if rec.start() never fires any callback (rare browser bug),
    // force-reset the guard after 4s and retry.
    watchdogTmr.current = setTimeout(() => {
      if (isStartingRef.current && isListeningRef.current) {
        console.warn('[Voice] Watchdog fired — rec.start() never completed. Retrying.');
        destroyRec();
        engineRef.current.schedule(500);
      }
    }, STARTING_WATCHDOG_MS);

    const rec = new SpeechRecognition();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = langRef.current;
    rec.maxAlternatives = 5;
    recRef.current = rec;

    // ── onstart ──────────────────────────────────────────────────────────────
    rec.onstart = () => {
      if (recRef.current !== rec) return; // stale
      clearWatchdog();
      isStartingRef.current = false;
      retryDelayRef.current = 300;
      setStatus('listening');
      setError(null);

      // Proactive restart at 55s — avoids Chrome's internal 60s session kill.
      sessionTmr.current = setTimeout(() => {
        if (isListeningRef.current && recRef.current === rec) {
          engineRef.current.schedule(50);
        }
      }, PROACTIVE_RESTART_MS);
    };

    // ── onresult ─────────────────────────────────────────────────────────────
    rec.onresult = (event) => {
      if (recRef.current !== rec) return; // stale
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];

        if (result.isFinal) {
          const alts = [];
          for (let a = 0; a < result.length; a++) {
            const t = result[a].transcript.trim();
            if (t) alts.push(t);
          }

          if (alts.length > 0) {
            const key = alts[0].toLowerCase().replace(/\s+/g, ' ');
            const now = Date.now();

            // Reduced debounce window: 800ms blocks re-emits from auto-restart
            // but lets users order the same item again quickly.
            if (!debounceMap.current[key] || now - debounceMap.current[key] > DEBOUNCE_MS) {
              debounceMap.current[key] = now;
              setInterimText('');
              callbackRef.current?.(alts);
            }

            // Prune entries older than 30s
            const cutoff = now - 30_000;
            for (const k in debounceMap.current) {
              if (debounceMap.current[k] < cutoff) delete debounceMap.current[k];
            }
          }
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimText(interim.trim());
    };

    // ── onerror ──────────────────────────────────────────────────────────────
    rec.onerror = (event) => {
      if (recRef.current !== rec) return; // stale
      clearWatchdog();
      isStartingRef.current = false;

      switch (event.error) {
        case 'no-speech':
          // Normal — user paused. Destroy current rec immediately so onend
          // doesn't fire a second concurrent schedule(), then restart cleanly.
          destroyRec();
          retryDelayRef.current = 300;
          engineRef.current.schedule(300);
          break;

        case 'audio-capture':
          setError('Microphone unavailable. Reconnecting…');
          destroyRec();
          engineRef.current.schedule(retryDelayRef.current);
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, 3000);
          break;

        case 'network':
          setError('Network issue. Reconnecting…');
          destroyRec();
          engineRef.current.schedule(retryDelayRef.current);
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, 3000);
          break;

        case 'not-allowed':
        case 'service-not-allowed':
          destroyRec();
          setError('Microphone permission denied. Allow access and tap Try Again.');
          setStatus('error');
          isListeningRef.current = false;
          setIsRecording(false);
          break;

        default:
          // 'aborted' = we triggered it intentionally — recover silently.
          // Unknown errors: try to recover.
          destroyRec();
          engineRef.current.schedule(Math.min(retryDelayRef.current, 1500));
          retryDelayRef.current = Math.min(retryDelayRef.current * 1.5, 3000);
      }
    };

    // ── onend ────────────────────────────────────────────────────────────────
    // Fires after every stop. Only schedules a restart if:
    //   1. User hasn't manually stopped (isListeningRef.current === true)
    //   2. This is still the active instance (recRef.current === rec)
    //   3. No restart is already pending (restartTmr.current === null)
    //      — this prevents a double-schedule when onerror already queued one.
    rec.onend = () => {
      if (recRef.current !== rec) return; // stale — destroyRec already swapped it out
      clearWatchdog();
      isStartingRef.current = false;
      setInterimText('');

      if (isListeningRef.current && restartTmr.current === null) {
        // Only schedule if onerror didn't already queue a restart
        engineRef.current.schedule(200);
      }
    };

    try {
      rec.start();
    } catch (err) {
      console.warn('[Voice] rec.start() threw synchronously:', err.message);
      clearWatchdog();
      isStartingRef.current = false;
      engineRef.current.schedule(500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Assigned every render so schedule() always calls the latest createAndStart.
  engineRef.current = {
    start: createAndStart,
    schedule(delayMs = 300) {
      clearRestartTimer();
      if (!isListeningRef.current) return;
      setStatus('reconnecting');
      restartTmr.current = setTimeout(() => {
        restartTmr.current = null; // clear BEFORE calling createAndStart
        if (isListeningRef.current) createAndStart();
      }, delayMs);
    },
  };

  // ── Public API ───────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (isListeningRef.current) return; // already running — ignore double-tap

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      setError('Microphone permission denied. Please allow access and try again.');
      setStatus('error');
      return;
    }

    debounceMap.current   = {};
    retryDelayRef.current = 300;
    isListeningRef.current = true;
    setIsRecording(true);
    setError(null);

    startTimeRef.current = Date.now();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    createAndStart();
  }, [createAndStart]);

  const stopRecording = useCallback(() => {
    isListeningRef.current = false;
    isStartingRef.current  = false;
    debounceMap.current    = {};
    clearRestartTimer();
    clearSessionTimer();
    destroyRec();
    setIsRecording(false);
    setInterimText('');
    setStatus('idle');
    setError(null);
    clearInterval(timerRef.current);
    setDuration(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    isListeningRef.current = false;
    clearRestartTimer();
    clearSessionTimer();
    clearInterval(timerRef.current);
    destroyRec();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isRecording, interimText, duration, status, error, startRecording, stopRecording };
}
