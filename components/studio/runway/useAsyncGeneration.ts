"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notifyCreditsChanged } from "@/lib/credits-ui-storage";

export type GenerationStatus =
  | "idle"
  | "submitting"
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "error";

type TaskPollResponse = {
  status?: string;
  progress?: number;
  output?: string[];
  failure?: string;
  failureCode?: string;
  error?: string;
  creditsRefunded?: boolean;
};

const POLL_MS = 3000;

/** Shared async generation poller for Runway or Pollo APIs. */
export function useAsyncGeneration(apiBase: "/api/runway" | "/api/pollo") {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [outputKind, setOutputKind] = useState<"video" | "image">("video");
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [creditsCharged, setCreditsCharged] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
    startedAtRef.current = null;
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startElapsedTimer = useCallback(() => {
    startedAtRef.current = Date.now();
    setElapsedSec(0);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    elapsedRef.current = setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
  }, []);

  const pollTask = useCallback(
    (id: string) => {
      stopPolling();
      startElapsedTimer();

      const check = async () => {
        try {
          const res = await fetch(`${apiBase}/tasks/${id}`, {
            credentials: "include",
          });
          const data = (await res.json()) as TaskPollResponse;

          if (!res.ok) {
            setError(data.error ?? "Failed to check generation status.");
            setStatus("error");
            stopPolling();
            return;
          }

          if (data.status === "SUCCEEDED") {
            setOutput(data.output ?? []);
            setProgress(100);
            setStatus("succeeded");
            stopPolling();
            return;
          }

          if (data.status === "FAILED") {
            const base = data.failure ?? "Generation failed.";
            setError(
              data.creditsRefunded ? `${base} Your credits were refunded.` : base
            );
            setStatus("failed");
            if (data.creditsRefunded) notifyCreditsChanged();
            stopPolling();
            return;
          }

          if (data.status === "RUNNING") {
            setStatus("running");
            setProgress(data.progress ?? 0);
            return;
          }

          setStatus("pending");
        } catch {
          setError("Network error while checking status.");
          setStatus("error");
          stopPolling();
        }
      };

      void check();
      pollRef.current = setInterval(() => {
        void check();
      }, POLL_MS);
    },
    [apiBase, startElapsedTimer, stopPolling]
  );

  const generate = useCallback(
    async (body: FormData) => {
      setError(null);
      setOutput([]);
      setProgress(0);
      setTaskId(null);
      setElapsedSec(0);
      setCreditsCharged(null);
      setStatus("submitting");

      try {
        const res = await fetch(`${apiBase}/generate`, {
          method: "POST",
          credentials: "include",
          body,
        });
        const data = (await res.json()) as {
          error?: string;
          taskId?: string;
          kind?: "video" | "image";
          creditsCharged?: number;
          balance?: number;
          creditsRequired?: number;
        };

        if (!res.ok) {
          setError(data.error ?? "Generation failed to start.");
          setStatus("error");
          if (res.status === 402) notifyCreditsChanged();
          return;
        }

        if (!data.taskId) {
          setError("Unexpected response from server.");
          setStatus("error");
          return;
        }

        setTaskId(data.taskId);
        setOutputKind(data.kind ?? "video");
        setCreditsCharged(data.creditsCharged ?? null);
        setStatus("pending");
        notifyCreditsChanged();
        pollTask(data.taskId);
      } catch {
        setError("Network error. Try again.");
        setStatus("error");
      }
    },
    [apiBase, pollTask]
  );

  const reset = useCallback(() => {
    stopPolling();
    setStatus("idle");
    setProgress(0);
    setOutput([]);
    setError(null);
    setTaskId(null);
    setElapsedSec(0);
    setCreditsCharged(null);
  }, [stopPolling]);

  const isGenerating =
    status === "submitting" ||
    status === "pending" ||
    status === "running";

  return {
    status,
    progress,
    output,
    outputKind,
    error,
    taskId,
    elapsedSec,
    creditsCharged,
    isGenerating,
    generate,
    reset,
  };
}

export function useRunwayGeneration() {
  return useAsyncGeneration("/api/runway");
}

export function usePolloGeneration() {
  return useAsyncGeneration("/api/pollo");
}
