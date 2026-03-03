/**
 * Feedback Service
 * Collects accuracy feedback on diagnoses to improve detection over time
 */

import { appendFile, exists } from "fs/promises";
import { join } from "path";

interface FeedbackRequest {
  diagnosis_id?: string;
  endpoint: "/bias_scan" | "/calibration_audit" | "/reasoning_trace_analysis";
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
}

const FEEDBACK_FILE = join(import.meta.dir, "feedback.jsonl");

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

  // Append to JSONL file
  const line = JSON.stringify(record) + "\n";
  await appendFile(FEEDBACK_FILE, line);

  return {
    received: true,
    feedback_id,
    message: "Thank you for the feedback. This helps improve detection accuracy.",
  };
}
