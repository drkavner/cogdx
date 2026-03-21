/**
 * Feedback Service
 * Collects accuracy feedback on diagnoses to improve detection over time
 * Awards credits to wallets for valuable feedback
 */

import { appendFile, mkdir } from "fs/promises";
import { join } from "path";
import { addCredits, calculateFeedbackCredits, getBalance, CREDIT_REWARDS } from "./credits";
import { getDiagnosis, getTotalPaidByAgent, getTotalPaidByWallet, markFeedbackSubmitted } from "./diagnosis-ledger";

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

  // SECURITY: Validate diagnosis_id exists and was paid for
  if (!request.diagnosis_id) {
    throw new Error("diagnosis_id is required. You must reference a paid API call to submit feedback.");
  }

  const diagnosis = await getDiagnosis(request.diagnosis_id);
  if (!diagnosis) {
    throw new Error("Diagnosis not found. Invalid diagnosis_id or diagnosis expired.");
  }

  // SECURITY: Verify agent_id matches the diagnosis
  if (diagnosis.agent_id !== request.agent_id) {
    throw new Error("Agent mismatch: diagnosis_id was created by a different agent.");
  }

  // SECURITY: Verify endpoint matches
  if (diagnosis.endpoint !== request.endpoint) {
    throw new Error(`Endpoint mismatch: diagnosis was for ${diagnosis.endpoint}, not ${request.endpoint}`);
  }

  const feedback_id = generateId();
  let creditsAwarded = 0;
  let walletBalance = 0;
  
  // Calculate and award credits if wallet provided
  if (request.wallet) {
    if (!isValidWallet(request.wallet)) {
      throw new Error("Invalid wallet address. Must be a valid Ethereum address (0x...)");
    }

    // SECURITY: Can only earn credits if diagnosis was paid for (not via coupon)
    if (diagnosis.payment_method && diagnosis.payment_method.startsWith("coupon")) {
      throw new Error(
        "Cannot earn credits from feedback on coupon-based diagnoses. " +
        "You can only earn credits from diagnoses you paid for with real funds (x402 or wallet credits)."
      );
    }

    // SECURITY: Agent cannot earn more credits than they've paid in via real payments
    const totalPaidRealMoney = await getTotalPaidByWallet(request.wallet, true); // true = exclude coupons
    const hasComments = !!(request.comments && request.comments.length > 10);
    creditsAwarded = calculateFeedbackCredits(request.accurate, hasComments);

    // Check: new credits + existing balance <= total paid (via real money)
    const { balance } = await getBalance(request.wallet);
    const projectedBalance = balance + creditsAwarded;

    if (totalPaidRealMoney === 0) {
      throw new Error(
        "You must pay for at least one diagnosis with real funds (x402 USDC) " +
        "before you can earn credits from feedback. Coupons don't qualify."
      );
    }

    if (projectedBalance > totalPaidRealMoney) {
      throw new Error(
        `Cannot earn more credits than paid in with real funds. You've paid $${totalPaidRealMoney.toFixed(2)}, ` +
        `currently have $${balance.toFixed(2)} in credits, ` +
        `and would have $${projectedBalance.toFixed(2)} after earning $${creditsAwarded.toFixed(2)}. ` +
        `Please pay in more USDC first.`
      );
    }
    
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
