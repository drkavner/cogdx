/**
 * Feedback Service
 * Collects accuracy feedback on diagnoses to improve detection over time
 */

import { appendFile, mkdir } from "fs/promises";
import { join } from "path";

interface FeedbackRequest {
  diagnosis_id?: string;
  endpoint: "/bias_scan" | "/calibration_audit" | "/reasoning_trace_analysis" | "/deception_audit" | "/verify_consensus";
  accurate: boolean;
  severity_correct?: boolean | null;
  comments?: string;
  agent_id: string;
}

interface FeedbackRecord extends FeedbackRequest {
  feedback_id: string;
  timestamp: string;
}

interface FeedbackResponse {
  received: boolean;
  feedback_id: string;
  message: string;
  records_count?: number;
}

// Use persistent data directory (mounted volume in production)
const DATA_DIR = process.env.NODE_ENV === "production" ? "/app/data" : join(import.meta.dir, "../data");
const FEEDBACK_FILE = join(DATA_DIR, "feedback.jsonl");

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
}

function generateId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export async function submitFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
  if (!request.agent_id) {
    throw new Error("agent_id is required");
  }

  if (!request.endpoint) {
    throw new Error("endpoint is required");
  }

  if (typeof request.accurate !== "boolean") {
    throw new Error("accurate (boolean) is required");
  }

  const feedback_id = generateId();
  
  const record: FeedbackRecord = {
    feedback_id,
    timestamp: new Date().toISOString(),
    ...request,
  };

  // Ensure data directory exists and append to JSONL file
  await ensureDataDir();
  const line = JSON.stringify(record) + "\n";
  await appendFile(FEEDBACK_FILE, line);
  
  // Count total records for transparency
  let recordsCount = 1;
  try {
    const file = Bun.file(FEEDBACK_FILE);
    const content = await file.text();
    recordsCount = content.split("\n").filter(l => l.trim()).length;
  } catch (e) {
    // File might not exist yet
  }

  return {
    received: true,
    feedback_id,
    records_count: recordsCount,
    message: `Thank you for the feedback. This helps improve detection accuracy. (Total feedback records: ${recordsCount})`,
  };
}
