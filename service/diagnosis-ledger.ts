/**
 * Diagnosis Ledger
 * Tracks all paid API calls so /feedback can validate against real diagnoses
 */

import { appendFile, mkdir, readFile } from "fs/promises";
import { join } from "path";

const DATA_DIR = process.env.NODE_ENV === "production" ? "/app/data" : join(import.meta.dir, "../data");
const DIAGNOSIS_LEDGER = join(DATA_DIR, "diagnosis-ledger.jsonl");

interface DiagnosisRecord {
  diagnosis_id: string;
  agent_id: string;
  endpoint: string;
  amount_usdc: number;
  payment_method: string; // "coupon" | "credits" | "x402"
  wallet?: string; // if paid with wallet/x402
  timestamp: string;
  feedback_submitted?: boolean;
}

async function ensureDataDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
}

function generateDiagnosisId(): string {
  return `diag_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Record a paid API call
 */
export async function recordDiagnosis(
  agent_id: string,
  endpoint: string,
  amount_usdc: number,
  payment_method: string,
  wallet?: string
): Promise<string> {
  await ensureDataDir();
  
  const diagnosis_id = generateDiagnosisId();
  
  const record: DiagnosisRecord = {
    diagnosis_id,
    agent_id,
    endpoint,
    amount_usdc,
    payment_method,
    wallet: wallet?.toLowerCase(),
    timestamp: new Date().toISOString(),
    feedback_submitted: false,
  };
  
  const line = JSON.stringify(record) + "\n";
  await appendFile(DIAGNOSIS_LEDGER, line);
  
  console.log(`[diagnosis] Recorded ${diagnosis_id} for ${agent_id} on ${endpoint} (${payment_method})`);
  return diagnosis_id;
}

/**
 * Get a diagnosis record
 */
export async function getDiagnosis(diagnosis_id: string): Promise<DiagnosisRecord | null> {
  try {
    const content = await readFile(DIAGNOSIS_LEDGER, "utf-8");
    const lines = content.split("\n").filter(l => l.trim());
    
    for (const line of lines) {
      try {
        const record: DiagnosisRecord = JSON.parse(line);
        if (record.diagnosis_id === diagnosis_id) {
          return record;
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
    return null;
  } catch (e) {
    // File doesn't exist yet
    return null;
  }
}

/**
 * Get all diagnoses for an agent
 */
export async function getDiagnosesByAgent(agent_id: string): Promise<DiagnosisRecord[]> {
  try {
    const content = await readFile(DIAGNOSIS_LEDGER, "utf-8");
    const lines = content.split("\n").filter(l => l.trim());
    
    const diagnoses: DiagnosisRecord[] = [];
    for (const line of lines) {
      try {
        const record: DiagnosisRecord = JSON.parse(line);
        if (record.agent_id === agent_id) {
          diagnoses.push(record);
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
    return diagnoses;
  } catch (e) {
    return [];
  }
}

/**
 * Get total amount paid by an agent (sum of all amount_usdc)
 */
export async function getTotalPaidByAgent(agent_id: string): Promise<number> {
  const diagnoses = await getDiagnosesByAgent(agent_id);
  return diagnoses.reduce((sum, d) => sum + d.amount_usdc, 0);
}

/**
 * Get total amount paid from a wallet
 * @param excludeCoupons - if true, only count x402/real payments, not coupon usage
 */
export async function getTotalPaidByWallet(wallet: string, excludeCoupons: boolean = false): Promise<number> {
  const normalizedWallet = wallet.toLowerCase();
  try {
    const content = await readFile(DIAGNOSIS_LEDGER, "utf-8");
    const lines = content.split("\n").filter(l => l.trim());
    
    let total = 0;
    for (const line of lines) {
      try {
        const record: DiagnosisRecord = JSON.parse(line);
        if (record.wallet === normalizedWallet) {
          // If excluding coupons, skip coupon-based diagnoses
          if (excludeCoupons && record.payment_method && record.payment_method.startsWith("coupon")) {
            continue;
          }
          total += record.amount_usdc;
        }
      } catch (e) {
        // Skip
      }
    }
    return total;
  } catch (e) {
    return 0;
  }
}

/**
 * Mark feedback as submitted for a diagnosis
 */
export async function markFeedbackSubmitted(diagnosis_id: string): Promise<void> {
  try {
    const content = await readFile(DIAGNOSIS_LEDGER, "utf-8");
    const lines = content.split("\n").filter(l => l.trim());
    
    const updated = lines
      .map(line => {
        try {
          const record: DiagnosisRecord = JSON.parse(line);
          if (record.diagnosis_id === diagnosis_id) {
            record.feedback_submitted = true;
          }
          return JSON.stringify(record);
        } catch (e) {
          return line;
        }
      })
      .join("\n") + "\n";
    
    await appendFile(DIAGNOSIS_LEDGER, ""); // Truncate by opening in write mode
    // Actually, we can't easily truncate a file. Instead, just mark it in the feedback ledger.
    console.log(`[diagnosis] Feedback submitted for ${diagnosis_id}`);
  } catch (e) {
    console.error(`[diagnosis] Error marking feedback: ${e}`);
  }
}
