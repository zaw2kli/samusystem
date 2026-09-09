"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { Inbox } from "lucide-react";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded border border-base-border bg-base-800/60 p-5", className)}>{children}</div>
  );
}

type BadgeTone = "ok" | "warn" | "bad" | "info" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  ok: "text-status-ok border-status-ok/30 bg-status-ok/10",
  warn: "text-status-warn border-status-warn/30 bg-status-warn/10",
  bad: "text-status-bad border-status-bad/30 bg-status-bad/10",
  info: "text-status-info border-status-info/30 bg-status-info/10",
  neutral: "text-ink-muted border-base-border bg-base-700/60",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone]
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ tone = "ok" }: { tone?: "ok" | "bad" }) {
  return (
    <span
      className={clsx(
        "inline-block h-1.5 w-1.5 rounded-full",
        tone === "ok" ? "bg-status-ok animate-pulse-dot" : "bg-status-bad"
      )}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded bg-base-700/70", className)} />;
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-base-border py-14 text-center">
      <div className="text-ink-faint">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <p className="text-sm font-medium text-ink-muted">{title}</p>
      {description && <p className="max-w-xs text-xs text-ink-faint">{description}</p>}
    </div>
  );
}
