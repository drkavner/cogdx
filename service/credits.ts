/**
 * Credits Ledger
 * Tracks wallet balances earned from feedback
 */

import { appendFile, mkdir, readFile } from "fs/promises";
import { join } from "path";

const DATA_DIR = process.env.NODE_ENV === "production" ? "/app/data" : join(import.meta.dir, "../data");
const CREDITS_FILE = join(DATA_DIR, "credits.jsonl");

// Credit rewards per action
export const CREDIT_REWARDS = {
  feedback_accurate: 0.02,    // $0.02 for confirming accuracy
  feedback_inaccurate: 0.05,  // $0.05 for flagging inaccuracy (more valuable)
  feedback_with_details: 0.03, // Bonus for detailed comments
};

interface CreditEntry {
  wallet: string;
  amount: number;
  reason: string;
  timestamp: string;
  feedback_id?: string;
}

interface WalletBalance {
  wallet: string;
  balance: number;
  transactions: number;
}

async function ensureDataDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
}

/**
 * Add credits to a wallet
 */
export async function addCredits(wallet: string, amount: number, reason: string, feedback_id?: string): Promise<CreditEntry> {
  await ensureDataDir();
  
  const entry: CreditEntry = {
    wallet: wallet.toLowerCase(),
    amount,
    reason,
    timestamp: new Date().toISOString(),
    feedback_id,
  };
  
  const line = JSON.stringify(entry) + "\n";
  await appendFile(CREDITS_FILE, line);
  
  console.log(`[credits] Added $${amount.toFixed(4)} to ${wallet} for ${reason}`);
  return entry;
}

/**
 * Get balance for a wallet
 */
export async function getBalance(wallet: string): Promise<WalletBalance> {
  const normalizedWallet = wallet.toLowerCase();
  
  try {
    const content = await readFile(CREDITS_FILE, "utf-8");
    const lines = content.split("\n").filter(l => l.trim());
    
    let balance = 0;
    let transactions = 0;
    
    for (const line of lines) {
      try {
        const entry: CreditEntry = JSON.parse(line);
        if (entry.wallet === normalizedWallet) {
          balance += entry.amount;
          transactions++;
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
    
    return { wallet: normalizedWallet, balance, transactions };
  } catch (e) {
    // File doesn't exist yet
    return { wallet: normalizedWallet, balance: 0, transactions: 0 };
  }
}

/**
 * Deduct credits from a wallet (for API calls)
 * Returns true if sufficient balance, false otherwise
 */
export async function deductCredits(wallet: string, amount: number, endpoint: string): Promise<boolean> {
  const { balance } = await getBalance(wallet);
  
  if (balance < amount) {
    return false;
  }
  
  // Record negative entry
  await addCredits(wallet, -amount, `API call: ${endpoint}`);
  return true;
}

/**
 * Calculate credits earned for feedback
 */
export function calculateFeedbackCredits(accurate: boolean, hasComments: boolean): number {
  let credits = accurate ? CREDIT_REWARDS.feedback_accurate : CREDIT_REWARDS.feedback_inaccurate;
  if (hasComments) {
    credits += CREDIT_REWARDS.feedback_with_details;
  }
  return credits;
}
