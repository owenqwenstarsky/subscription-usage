/** Shared formatting helpers (safe for client + server). */

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

export function formatWindow(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) {
    const h = seconds / 3600;
    return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
  }
  const d = seconds / 86400;
  return `${Number.isInteger(d) ? d : d.toFixed(1)}d`;
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "unknown";
  return date.toLocaleString(undefined, { timeZoneName: "short" });
}

/** True when the timestamp is in the past (or unparseable -> false). */
export function isPast(value: string | null | undefined, now: number): boolean {
  const date = parseDate(value);
  if (!date) return false;
  return date.getTime() <= now;
}

export function formatCountdown(target: string | null | undefined, now: number): string {
  const date = parseDate(target);
  if (!date) return "unknown";
  const diffMs = date.getTime() - now;
  if (diffMs <= 0) return "now";
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatAgo(value: string | null | undefined, now: number): string {
  const date = parseDate(value);
  if (!date) return "unknown";
  const diffMs = now - date.getTime();
  if (diffMs < 0) return "just now";
  const totalSeconds = Math.floor(diffMs / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s ago`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ago`;
}

export function truncateMiddle(value: string, maxLength = 18): string {
  if (value.length <= maxLength) return value;
  const keep = Math.max(4, Math.floor((maxLength - 3) / 2));
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

export function accountDisplayName(account: {
  label?: string;
  email?: string;
  id: string;
}): string {
  if (account.label?.trim()) return account.label.trim();
  if (account.email?.trim()) return account.email.trim();
  return account.id;
}
