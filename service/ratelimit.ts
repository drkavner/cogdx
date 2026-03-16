/**
 * Rate Limiting for CogDx API
 * Protects against abuse while allowing generous free-tier usage
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

const RATE_LIMIT_FILE = "/tmp/cogdx-ratelimits.json";

// Free-tier limits (per wallet, per day)
const FREE_TIER_LIMITS = {
  daily_calls: 100,      // 100 calls per day
  monthly_calls: 2000,   // 2000 calls per month
};

interface RateLimitEntry {
  wallet: string;
  daily_count: number;
  monthly_count: number;
  last_daily_reset: string;  // ISO date
  last_monthly_reset: string; // ISO date (first of month)
}

interface RateLimitStore {
  entries: Record<string, RateLimitEntry>;
}

function loadStore(): RateLimitStore {
  try {
    if (existsSync(RATE_LIMIT_FILE)) {
      return JSON.parse(readFileSync(RATE_LIMIT_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("[RATELIMIT] Failed to load store:", e);
  }
  return { entries: {} };
}

function saveStore(store: RateLimitStore): void {
  try {
    writeFileSync(RATE_LIMIT_FILE, JSON.stringify(store, null, 2));
  } catch (e) {
    console.error("[RATELIMIT] Failed to save store:", e);
  }
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function checkRateLimit(wallet: string): { allowed: boolean; reason?: string; remaining?: number } {
  if (!wallet) {
    // No wallet = no rate limit tracking (will fail at payment check anyway)
    return { allowed: true };
  }

  const store = loadStore();
  const today = getToday();
  const monthStart = getMonthStart();

  let entry = store.entries[wallet];

  if (!entry) {
    entry = {
      wallet,
      daily_count: 0,
      monthly_count: 0,
      last_daily_reset: today,
      last_monthly_reset: monthStart,
    };
  }

  // Reset daily counter if new day
  if (entry.last_daily_reset !== today) {
    entry.daily_count = 0;
    entry.last_daily_reset = today;
  }

  // Reset monthly counter if new month
  if (entry.last_monthly_reset !== monthStart) {
    entry.monthly_count = 0;
    entry.last_monthly_reset = monthStart;
  }

  // Check limits
  if (entry.daily_count >= FREE_TIER_LIMITS.daily_calls) {
    return {
      allowed: false,
      reason: `Daily limit reached (${FREE_TIER_LIMITS.daily_calls}/day). Resets at midnight UTC.`,
      remaining: 0,
    };
  }

  if (entry.monthly_count >= FREE_TIER_LIMITS.monthly_calls) {
    return {
      allowed: false,
      reason: `Monthly limit reached (${FREE_TIER_LIMITS.monthly_calls}/month). Resets on the 1st.`,
      remaining: 0,
    };
  }

  store.entries[wallet] = entry;
  saveStore(store);

  return {
    allowed: true,
    remaining: Math.min(
      FREE_TIER_LIMITS.daily_calls - entry.daily_count,
      FREE_TIER_LIMITS.monthly_calls - entry.monthly_count
    ),
  };
}

export function recordUsage(wallet: string): void {
  if (!wallet) return;

  const store = loadStore();
  const today = getToday();
  const monthStart = getMonthStart();

  let entry = store.entries[wallet];

  if (!entry) {
    entry = {
      wallet,
      daily_count: 0,
      monthly_count: 0,
      last_daily_reset: today,
      last_monthly_reset: monthStart,
    };
  }

  // Reset if needed
  if (entry.last_daily_reset !== today) {
    entry.daily_count = 0;
    entry.last_daily_reset = today;
  }
  if (entry.last_monthly_reset !== monthStart) {
    entry.monthly_count = 0;
    entry.last_monthly_reset = monthStart;
  }

  // Increment
  entry.daily_count++;
  entry.monthly_count++;

  store.entries[wallet] = entry;
  saveStore(store);

  console.log(`[RATELIMIT] ${wallet}: ${entry.daily_count}/${FREE_TIER_LIMITS.daily_calls} daily, ${entry.monthly_count}/${FREE_TIER_LIMITS.monthly_calls} monthly`);
}

export function getUsageStats(wallet: string): RateLimitEntry | null {
  if (!wallet) return null;
  const store = loadStore();
  return store.entries[wallet] || null;
}
