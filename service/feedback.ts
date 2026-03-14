/**
 * Feedback Service
 * Collects accuracy feedback on diagnoses to improve detection over time
 * Awards credits to wallets for valuable feedback
 */

import { appendFile, mkdir } from "fs/promises";
import { join } from "path";
import { addCredits, calculateFeedbackCredits, getBalance, CREDIT_REWARDS } from "./credits";

interface FeedbackRequest {
  diagnosis_id?: string;
  feedback_id?: string;  // For pre_trade_audit outcome tracking
  endpoint: "/bias_scan" | "/calibration_audit" | "/reasoning_trace_analysis" | "/deception_audit" | "/verify_consensus" | "/pre_trade_audit";
  accurate: boolean;
  severity_correct?: boolean | null;
  comments?: string;
  agent_id: string;
  wallet?: string;  // Optional: earn credits to this wallet
  // Pre-trade audit specific fields
  trade_outcome?: "win" | "loss" | "breakeven";
  pnl_percent?: number;  // Profit/loss percentage
  followed_recommendation?: boolean;
}

interface FeedbackRecord extends FeedbackRequest {
  feedback_id: string;
  timestamp: string;
  credits_awarded?: number;
}

interface FeedbackResponse {
  received: boolean;
  feedback_id: string;
  message: string;
  records_count?: number;
  credits?: {
    awarded: number;
    new_balance: number;
    wallet: string;
  };
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

function isValidWallet(wallet: string): boolean {
  // Basic Ethereum address validation
  return /^0x[a-fA-F0-9]{40}$/.test(wallet);
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
  let creditsAwarded = 0;
  let walletBalance = 0;
  
  // Calculate and award credits if wallet provided
  if (request.wallet) {
    if (!isValidWallet(request.wallet)) {
      throw new Error("Invalid wallet address. Must be a valid Ethereum address (0x...)");
    }
    
    const hasComments = !!(request.comments && request.comments.length > 10);
    creditsAwarded = calculateFeedbackCredits(request.accurate, hasComments);
    
    await addCredits(request.wallet, creditsAwarded, 
      `feedback:${request.endpoint}:${request.accurate ? "accurate" : "inaccurate"}`,
      feedback_id
    );
    
    const balance = await getBalance(request.wallet);
    walletBalance = balance.balance;
  }
  
  const record: FeedbackRecord = {
    feedback_id,
    timestamp: new Date().toISOString(),
    credits_awarded: creditsAwarded > 0 ? creditsAwarded : undefined,
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

  const response: FeedbackResponse = {
    received: true,
    feedback_id,
    records_count: recordsCount,
    message: request.wallet 
      ? `Feedback received. Awarded $${creditsAwarded.toFixed(4)} to ${request.wallet}. New balance: $${walletBalance.toFixed(4)}`
      : `Feedback received. Tip: Include a wallet address to earn credits for future API calls.`,
  };
  
  if (request.wallet) {
    response.credits = {
      awarded: creditsAwarded,
      new_balance: walletBalance,
      wallet: request.wallet.toLowerCase(),
    };
  }

  return response;
}

// Export credit info endpoint
export async function getCreditsInfo(wallet: string): Promise<{
  wallet: string;
  balance: number;
  transactions: number;
  rewards: typeof CREDIT_REWARDS;
}> {
  if (!isValidWallet(wallet)) {
    throw new Error("Invalid wallet address");
  }
  
  const balance = await getBalance(wallet);
  return {
    ...balance,
    rewards: CREDIT_REWARDS,
  };
}
