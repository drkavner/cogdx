/**
 * Crash Monitoring & Auto-Restart
 * Tracks process health and triggers restart on failure
 */

import { spawn } from "child_process";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const RESTART_DELAY = 5000; // 5 seconds after detecting crash
const LOG_DIR = process.env.LOG_DIR || "/app/logs";

let lastHealthCheck = Date.now();
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

interface HealthMetrics {
  timestamp: string;
  uptime_ms: number;
  memory_mb: number;
  calls_total: number;
  errors_total: number;
  error_rate: number;
  status: "healthy" | "degraded" | "critical";
}

export async function startCrashMonitor(metricsCallback: () => any) {
  console.log("[MONITOR] Crash monitoring started");

  setInterval(async () => {
    try {
      const metrics = metricsCallback();
      const health = assessHealth(metrics);

      await recordHealthCheck(health);

      if (health.status === "critical") {
        consecutiveFailures++;
        console.error(
          `[MONITOR] CRITICAL health: ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}`
        );

        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.error(
            "[MONITOR] TRIGGERING AUTO-RESTART after consecutive failures"
          );
          await triggerRestart();
        }
      } else {
        consecutiveFailures = 0;
      }

      lastHealthCheck = Date.now();
    } catch (e) {
      console.error("[MONITOR] Health check error:", e);
    }
  }, HEALTH_CHECK_INTERVAL);
}

function assessHealth(metrics: any): HealthMetrics {
  const now = new Date().toISOString();
  const uptime_ms = Date.now() - (metrics.startedAt ? new Date(metrics.startedAt).getTime() : 0);
  const memory_mb = process.memoryUsage().heapUsed / 1024 / 1024;
  const error_rate = metrics.calls > 0 ? (metrics.errors || 0) / metrics.calls : 0;

  let status: "healthy" | "degraded" | "critical" = "healthy";

  // Check error rate
  if (error_rate > 0.1) {
    status = "degraded"; // >10% error rate
  }
  if (error_rate > 0.25) {
    status = "critical"; // >25% error rate
  }

  // Check memory
  if (memory_mb > 500) {
    status = "degraded";
  }
  if (memory_mb > 1000) {
    status = "critical";
  }

  // Check uptime (if down for >1h without restart, something's wrong)
  if (uptime_ms > 3600000 && (metrics.calls || 0) < 10) {
    status = "degraded"; // Running 1h+ with very few calls
  }

  return {
    timestamp: now,
    uptime_ms,
    memory_mb,
    calls_total: metrics.calls || 0,
    errors_total: metrics.errors || 0,
    error_rate,
    status,
  };
}

async function recordHealthCheck(health: HealthMetrics) {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    const logFile = join(LOG_DIR, "health.jsonl");
    const line = JSON.stringify(health) + "\n";
    await writeFile(logFile, line, { flag: "a" });
  } catch (e) {
    console.error("[MONITOR] Failed to write health log:", e);
  }
}

async function triggerRestart() {
  console.error("[MONITOR] Starting graceful restart...");

  try {
    // Log the restart event
    await mkdir(LOG_DIR, { recursive: true });
    const restartLog = join(LOG_DIR, "restarts.jsonl");
    const entry = {
      timestamp: new Date().toISOString(),
      reason: "Auto-restart triggered by crash monitor",
      consecutive_failures: consecutiveFailures,
    };
    await writeFile(restartLog, JSON.stringify(entry) + "\n", { flag: "a" });

    // Send restart signal to parent process
    process.kill(process.pid, "SIGHUP");

    // Fallback: exit with restart code
    setTimeout(() => {
      process.exit(1);
    }, RESTART_DELAY);
  } catch (e) {
    console.error("[MONITOR] Restart failed:", e);
  }
}

export function getLastHealthCheck(): number {
  return lastHealthCheck;
}
