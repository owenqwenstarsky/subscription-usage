"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Countdown } from "./Countdown";
import { deviceLoginKey } from "@/lib/cache-keys";
import { fetchJson, fetcher } from "@/lib/fetch-json";
import { DeviceLoginResponse } from "@/lib/types";

/**
 * Minimal add-account flow backed by the proxy device-login API:
 * start -> show auth_url + user_code -> poll every 3s until ready/expired/error.
 */
export function AddAccount({
  onAdded,
  onClose,
}: {
  onAdded: () => void;
  onClose: () => void;
}) {
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [loginId, setLoginId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const addedRef = useRef(false);
  const onAddedRef = useRef(onAdded);
  useEffect(() => {
    onAddedRef.current = onAdded;
  });

  const { data, error, mutate } = useSWR<DeviceLoginResponse>(
    loginId ? deviceLoginKey(loginId) : null,
    fetcher,
    {
      refreshInterval: 3000,
      revalidateOnFocus: false,
      dedupingInterval: 0,
      onSuccess: (d) => {
        if (d.login.status === "ready" && !addedRef.current) {
          addedRef.current = true;
          onAddedRef.current();
        }
      },
    },
  );

  const login = data?.login ?? null;
  const pollError =
    error instanceof Error ? error.message : error ? String(error) : null;

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    addedRef.current = false;
    try {
      const res = await fetchJson<DeviceLoginResponse>(
        "/api/device-login/start",
        { method: "POST" },
      );
      setLoginId(res.login.login_id);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  }

  function handleStartOver() {
    setLoginId(null);
    setStartError(null);
    addedRef.current = false;
    void handleStart();
  }

  function copyCode(code: string) {
    void navigator.clipboard
      ?.writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  }

  const terminal =
    login?.status === "ready" ||
    login?.status === "expired" ||
    login?.status === "error";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add account"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-700/90 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.025em] text-zinc-100">Add account</h2>
            <p className="mt-1 text-sm text-zinc-500">Connect with a device code.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded px-2 py-0.5 text-zinc-400 hover:text-zinc-200"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {!loginId ? (
          <div className="mt-4">
            {startError && (
              <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {startError}
              </div>
            )}
            <button
              onClick={() => void handleStart()}
              disabled={starting}
              className="mt-4 rounded-xl bg-teal-300 px-4 py-2 text-sm font-semibold text-teal-950 transition hover:bg-teal-200 disabled:opacity-50"
            >
              {starting ? "Starting…" : "Start device login"}
            </button>
          </div>
        ) : login ? (
          <div className="mt-4 space-y-3">
            {login.status === "pending" && (
              <>
                <p className="text-sm text-zinc-400">
                  Open the link, then enter this code.
                </p>
                <a
                  href={login.auth_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block break-all rounded-md bg-zinc-950 p-3 font-mono text-xs text-sky-300 ring-1 ring-zinc-800 hover:ring-zinc-600"
                >
                  {login.auth_url}
                </a>
                <div className="flex items-center justify-between rounded-md bg-zinc-950 p-3 ring-1 ring-zinc-800">
                  <span className="font-mono text-2xl font-semibold tracking-widest text-zinc-100">
                    {login.user_code}
                  </span>
                  <button
                    onClick={() => copyCode(login.user_code)}
                    className="rounded-md px-2 py-1 text-xs text-zinc-400 ring-1 ring-zinc-700 hover:text-zinc-200"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="inline-block size-2 animate-pulse rounded-full bg-amber-400" />
                  Waiting for authorization…
                  <Countdown
                    target={login.expires_at}
                    prefix="expires in"
                    expiredLabel="expiring…"
                  />
                  {pollError && (
                    <button
                      onClick={() => void mutate()}
                      className="underline hover:text-zinc-300"
                      title={pollError}
                    >
                      retry status
                    </button>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  I’ll finish later (login stays pending on the proxy)
                </button>
              </>
            )}
            {login.status === "ready" && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                Account added. The list refreshes automatically.
              </div>
            )}
            {(login.status === "expired" || login.status === "error") && (
              <>
                <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {login.status === "expired"
                    ? "This login expired. Start a new one."
                    : `Login failed: ${login.error || "unknown error"}`}
                </div>
                <button
                  onClick={handleStartOver}
                  disabled={starting}
                  className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
                >
                  {starting ? "Starting…" : "Start over"}
                </button>
              </>
            )}
            {terminal && login.status === "ready" && (
              <button
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm text-zinc-400 ring-1 ring-zinc-700 hover:text-zinc-200"
              >
                Done
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 text-sm text-zinc-400">
            {pollError ? (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {pollError}
              </div>
            ) : (
              "Loading login status…"
            )}
          </div>
        )}
      </div>
    </div>
  );
}
