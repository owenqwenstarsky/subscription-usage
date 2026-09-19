/**
 * TypeScript mirrors of the chatgpt-codex-proxy Go structs.
 *
 * Sources:
 * - chatgpt-codex-proxy/internal/accounts/account.go (Record, QuotaSnapshot, ...)
 * - chatgpt-codex-proxy/internal/server/admin.go (adminAccountResponse, adminAccountUsageResponse)
 * - chatgpt-codex-proxy/internal/server/health.go (healthResponse)
 */

export type AccountStatus = "active" | "disabled" | "expired" | "banned";

export type RotationStrategy =
  | "least_used"
  | "round_robin"
  | "sticky"
  | "sticky-thread";

export interface RateLimitWindow {
  allowed: boolean;
  limit_reached: boolean;
  used_percent?: number | null;
  reset_at?: string | null;
  limit_window_seconds?: number | null;
}

export interface CreditsSnapshot {
  has_credits: boolean;
  unlimited: boolean;
  balance?: number | null;
  active_limit?: string | null;
}

export interface QuotaSnapshot {
  plan_type: string;
  rate_limit: RateLimitWindow;
  secondary_rate_limit?: RateLimitWindow | null;
  code_review_rate_limit?: RateLimitWindow | null;
  credits?: CreditsSnapshot | null;
  source: string;
  fetched_at: string;
}

export interface AdminAccount {
  id: string;
  upstream_account_id: string;
  user_id?: string;
  email?: string;
  plan_type?: string;
  label?: string;
  status: AccountStatus;
  eligible_now: boolean;
  cooldown_until?: string | null;
  last_error?: string;
  cached_quota?: QuotaSnapshot | null;
  oauth_expires: string;
  created_at: string;
  updated_at: string;
}

export interface AdminAccountUsage {
  account_id: string;
  upstream_account_id: string;
  user_id?: string;
  status: AccountStatus;
  eligible_now: boolean;
  cooldown_until?: string | null;
  last_error?: string;
  cached_quota?: QuotaSnapshot | null;
  quota_runtime?: QuotaSnapshot | null;
  quota_source?: string;
  quota_fetched_at?: string | null;
  oauth_expires: string;
}

export interface ProxyHealth {
  status: string;
  accounts?: number;
  rotation?: RotationStrategy;
  continuations?: boolean;
  default_model?: string;
  codex_base_url?: string;
  request_timeout?: string;
  continuation_ttl?: string;
  sticky_thread_ttl?: string;
  error?: string;
}

export type DeviceLoginStatus = "pending" | "ready" | "expired" | "error";

export interface DeviceLoginRecord {
  login_id: string;
  auth_url: string;
  user_code: string;
  status: DeviceLoginStatus;
  error?: string;
  created_at: string;
  expires_at: string;
}

// ---- Shapes served by this website's own API routes ----

export interface ApiError {
  error: string;
  code: string;
  detail?: string;
  proxyStatus?: number;
}

export interface HealthResponse {
  proxyReachable: boolean;
  proxyHost: string;
  live?: ProxyHealth;
  health?: ProxyHealth;
  fetchedAt: string;
  /** Present when proxy is down or the authed call failed (bad key, ...). */
  error?: string;
  code?: string;
}

export interface AccountsResponse {
  accounts: AdminAccount[];
  fetchedAt: string;
}

export interface UsageAllItem {
  account: AdminAccount;
  /** Effective quota: live runtime when mode=live and fetch succeeded, else cached quota. */
  quota: QuotaSnapshot | null;
  quotaSource: string;
  quotaFetchedAt: string | null;
  /** Set when an individual account's live fetch failed; other items still succeed. */
  error?: string;
}

export interface UsageAllResponse {
  mode: "cached" | "live";
  items: UsageAllItem[];
  fetchedAt: string;
  /** Count of per-account failures in live mode. */
  failures: number;
}

export interface SingleUsageResponse {
  usage: AdminAccountUsage;
  fetchedAt: string;
}

export interface AccountMetaResponse {
  account: AdminAccount;
  fetchedAt: string;
}

export interface DeviceLoginResponse {
  login: DeviceLoginRecord;
  fetchedAt: string;
}

// ---- Proxy request activity + historical log shapes ----

/** Sanitized request lifecycle metadata. Payloads and credentials are never included. */
export interface ProxyRequestRecord {
  id: string;
  startedAt: string;
  endedAt?: string | null;
  route: string;
  model?: string | null;
  accountId?: string | null;
  accountLabel?: string | null;
  phase: "routing" | "upstream" | "streaming" | "finalizing" | "complete";
  outcome: "active" | "succeeded" | "failed" | "cancelled" | "timed_out";
  status?: number | null;
  durationMs?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface ActivitySnapshot {
  requests: ProxyRequestRecord[];
  emittedAt: string;
}

export interface ActivityUpsertEvent {
  type: "upsert";
  record: ProxyRequestRecord;
  emittedAt: string;
}

export interface ActivityRemoveEvent {
  type: "remove";
  id: string;
  emittedAt: string;
}

export interface ActivitySnapshotEvent {
  type: "snapshot";
  snapshot: ActivitySnapshot;
}

export type ActivityEvent =
  | ActivityUpsertEvent
  | ActivityRemoveEvent
  | ActivitySnapshotEvent;

export interface ActivityLogDay {
  date: string;
  total: number;
  failed: number;
}

export interface ActivityLogDatesResponse {
  days: ActivityLogDay[];
  fetchedAt: string;
}

export interface ActivityLogResponse {
  date: string;
  records: ProxyRequestRecord[];
  nextCursor?: string | null;
  fetchedAt: string;
}
