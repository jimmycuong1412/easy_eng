'use client';

/**
 * Mic capture + optional speech recognition for shadowing.
 *
 * Audio never leaves the browser: samples are reduced to an Envelope in-page
 * and the raw buffer is discarded.
 *
 * Degradation matters more than usual here because this runs on an anonymous
 * ad landing page across the full device spread:
 *   - No SpeechRecognition (Firefox, many Android WebViews) -> transcript is
 *     null and the caller falls back to a rhythm-only score. NOT an error.
 *   - Mic denied -> 'mic-denied', with a retry offered by the caller.
 *   - Silence recorded -> 'no-audio', so the caller can treat it as a no-op
 *     rather than showing a discouraging 0%.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { extractEnvelope, type Envelope } from '@easyeng/core';

export type RecorderState = 'idle' | 'recording' | 'processing';
export type RecorderError = 'mic-denied' | 'no-audio' | 'unsupported' | null;

export interface RecordingResult {
  envelope: Envelope;
  /** null when the browser cannot transcribe — caller scores rhythm only. */
  transcript: string | null;
}

/** Below this peak amplitude we treat the take as silence. */
const SILENCE_PEAK_THRESHOLD = 0.01;

function getSpeechRecognition(): any | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
  );
}

export function useRecorder(lang = 'en-US') {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<RecorderError>(null);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [hasRecognition, setHasRecognition] = useState(false);
  const [liveSamples, setLiveSamples] = useState<number[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string | null>(null);
  const sampleRateRef = useRef<number>(44100);

  useEffect(() => {
    setHasRecognition(getSpeechRecognition() !== null);
  }, []);

  const cleanup = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    try {
      recognitionRef.current?.stop();
    } catch {
      // Already stopped.
    }
    recognitionRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    chunksRef.current = [];
    transcriptRef.current = null;
    setLiveSamples([]);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('mic-denied');
      setState('idle');
      return;
    }

    streamRef.current = stream;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    sampleRateRef.current = ctx.sampleRate;

    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      chunksRef.current.push(new Float32Array(input));
      // Cheap live level for the waveform: peak of this block.
      let peak = 0;
      for (let i = 0; i < input.length; i++) {
        const v = Math.abs(input[i]);
        if (v > peak) peak = v;
      }
      setLiveSamples((prev) => [...prev.slice(-63), peak]);
    };

    source.connect(processor);
    processor.connect(ctx.destination);

    const SR = getSpeechRecognition();
    if (SR) {
      const rec = new SR();
      rec.lang = lang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e: any) => {
        transcriptRef.current = e.results[0][0].transcript as string;
      };
      // Recognition failure is non-fatal: we still have a rhythm score.
      rec.onerror = () => undefined;
      recognitionRef.current = rec;
      try {
        rec.start();
      } catch {
        recognitionRef.current = null;
      }
    }

    setState('recording');
  }, [lang]);

  const stop = useCallback(async () => {
    setState('processing');

    try {
      recognitionRef.current?.stop();
    } catch {
      // Already stopped.
    }

    // Give recognition a moment to deliver its final result.
    await new Promise((r) => setTimeout(r, 350));

    const chunks = chunksRef.current;
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    const rate = sampleRateRef.current;
    cleanup();
    setLiveSamples([]);

    let peak = 0;
    for (let i = 0; i < merged.length; i++) {
      const v = Math.abs(merged[i]);
      if (v > peak) peak = v;
    }

    if (merged.length === 0 || peak < SILENCE_PEAK_THRESHOLD) {
      // Recording nothing is not the same as failing. Surfacing a 0% here
      // would be discouraging at exactly the wrong moment.
      setError('no-audio');
      setState('idle');
      return;
    }

    setResult({
      envelope: extractEnvelope(merged, rate),
      transcript: transcriptRef.current,
    });
    setState('idle');
  }, [cleanup]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setState('idle');
  }, []);

  return { state, error, hasRecognition, start, stop, result, reset, liveSamples };
}
