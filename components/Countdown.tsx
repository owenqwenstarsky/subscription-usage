"use client";

import { useNow } from "./Now";
import { formatCountdown, isPast, parseDate } from "@/lib/format";

export function Countdown({
  target,
  prefix = "resets in",
  expiredLabel = "expired",
  className = "",
}: {
  target: string | null | undefined;
  prefix?: string;
  expiredLabel?: string;
  className?: string;
}) {
  const now = useNow();

  if (!target || !parseDate(target)) {
    return <span className={className}>reset unknown</span>;
  }

  if (isPast(target, now)) {
    return (
      <span className={className} title={new Date(target).toLocaleString()}>
        {expiredLabel}
      </span>
    );
  }

  return (
    <span className={className} title={new Date(target).toLocaleString()}>
      {prefix} {formatCountdown(target, now)}
    </span>
  );
}
