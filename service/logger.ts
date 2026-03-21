/**
 * Persistent Logging
 * Logs all API calls, errors, and alerts to disk
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const LOG_DIR = process.env.LOG_DIR || "/app/logs";

async function ensureLogDir() {
  try {
    await mkdir(LOG_DIR, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
}

interface LogEntry {
  timestamp: string;
  level: "INFO" | "ERROR" | "WARN" | "ALERT";
  message: string;
  context?: Record<string, any>;
}

export async function log(
  level: "INFO" | "ERROR" | "WARN" | "ALERT",
  message: string,
  context?: Record<string, any>
) {
  await ensureLogDir();

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: context || {},
  };

  const line = JSON.stringify(entry) + "\n";
  const logFile = join(LOG_DIR, "cogdx.log");

  try {
    await writeFile(logFile, line, { flag: "a" });
    console.log(`[${level}] ${message}`, context || "");
  } catch (e) {
    console.error(`[LOGGER_ERROR] Failed to write log: ${e}`);
  }
}

export async function logApiCall(
  endpoint: string,
  agentId: string,
  paymentMethod: string,
  amount: number,
  statusCode: number,
  responseTime: number
) {
  await log("INFO", `API Call: ${endpoint}`, {
    agent_id: agentId,
    endpoint,
    payment_method: paymentMethod,
    amount_usdc: amount,
    status: statusCode,
    response_time_ms: responseTime,
  });
}

export async function logError(message: string, error: any, context?: Record<string, any>) {
  await log("ERROR", message, {
    error: error?.message || String(error),
    stack: error?.stack,
    ...context,
  });
}

export async function logAlert(alertType: string, data: Record<string, any>) {
  await log("ALERT", alertType, data);
}

export async function logPaymentFailure(
  agentId: string,
  endpoint: string,
  reason: string
) {
  await log("WARN", `Payment Rejection: ${endpoint}`, {
    agent_id: agentId,
    reason,
  });
}
