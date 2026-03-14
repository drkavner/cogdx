/**
 * Pre-Trade Audit - Cognitive checklist for trading decisions
 * Bundle of checks: reasoning quality, confidence calibration, bias detection
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || "google/gemini-2.0-flash-001";

interface PreTradeInput {
  position: string;           // e.g., "long BTC", "short ETH", "buy YES on X"
  confidence: number;         // 0-1
  reasoning: string;          // Agent's reasoning for the trade
  entry_price?: number;       // Optional entry price
  sources?: string[];         // Optional: information sources used
  market_type?: string;       // "crypto" | "prediction" | "forex" | "other"
}

interface AuditCheck {
  score: number;
  issues?: string[];
  note?: string;
  flag?: boolean;
}

interface PreTradeResult {
  decision_readiness_score: number;
  checks: {
    reasoning_quality: AuditCheck;
    confidence_calibration: AuditCheck;
    anchoring_detection: AuditCheck;
    confirmation_bias: AuditCheck;
    information_freshness: AuditCheck;
  };
  cognitive_flags: string[];
  recommendation: string;
  feedback_id: string;
}

// Detect anchoring on round numbers
function detectAnchoring(entryPrice?: number): AuditCheck {
  if (!entryPrice) {
    return { score: 1.0, note: "No entry price provided - anchoring check skipped" };
  }

  const priceStr = entryPrice.toString();
  const isRoundNumber = entryPrice % 1000 === 0 || entryPrice % 100 === 0 || entryPrice % 10 === 0;
  const endsInZeros = priceStr.endsWith("000") || priceStr.endsWith("00") || priceStr.endsWith("0");
  
  if (isRoundNumber && endsInZeros) {
    return {
      score: 0.4,
      flag: true,
      note: `Entry price (${entryPrice}) is a round number - potential anchoring bias`,
      issues: ["Round number anchoring detected", "Consider if this price has psychological vs. technical basis"]
    };
  }

  return { score: 0.9, note: "Entry price does not show obvious anchoring patterns" };
}

// Analyze reasoning quality using LLM
async function analyzeReasoning(reasoning: string, position: string): Promise<AuditCheck> {
  if (!OPENROUTER_API_KEY) {
    return {
      score: 0.5,
      note: "LLM analysis unavailable - using heuristic checks",
      issues: detectBasicIssues(reasoning)
    };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a cognitive bias analyst. Evaluate trading reasoning for logical quality.
            
Return JSON only:
{
  "score": 0.0-1.0,
  "issues": ["list of cognitive/logical issues found"],
  "strengths": ["what's good about the reasoning"],
  "missing": ["what evidence or counterarguments are missing"]
}`
          },
          {
            role: "user",
            content: `Position: ${position}\n\nReasoning:\n${reasoning}\n\nAnalyze the logical quality of this trading reasoning.`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: parsed.score || 0.5,
        issues: [...(parsed.issues || []), ...(parsed.missing || [])].slice(0, 5),
        note: parsed.strengths?.[0] || "Analysis complete"
      };
    }
  } catch (e) {
    console.error("Reasoning analysis failed:", e);
  }

  return {
    score: 0.5,
    note: "Analysis fallback - using heuristic checks",
    issues: detectBasicIssues(reasoning)
  };
}

// Basic heuristic checks for reasoning
function detectBasicIssues(reasoning: string): string[] {
  const issues: string[] = [];
  const lower = reasoning.toLowerCase();

  // Check for hedging language (might indicate low confidence)
  if (/\b(maybe|might|could|possibly|perhaps)\b/i.test(reasoning)) {
    // This is actually good - shows epistemic humility
  }

  // Check for absolute language (overconfidence indicator)
  if (/\b(definitely|certainly|guaranteed|always|never|impossible)\b/i.test(reasoning)) {
    issues.push("Absolute language detected - may indicate overconfidence");
  }

  // Check for single source dependency
  if (reasoning.split(/[,;]/).length < 3 && reasoning.length > 50) {
    issues.push("Limited supporting points - consider diversifying reasoning");
  }

  // Check for counterargument consideration
  if (!/\b(however|but|although|risk|concern|bear case|downside)\b/i.test(reasoning)) {
    issues.push("No counterarguments addressed - confirmation bias risk");
  }

  // Check for recency bias language
  if (/\b(just|recently|today|yesterday|this week)\b/i.test(reasoning)) {
    issues.push("Recency-focused reasoning - check if short-term bias");
  }

  return issues;
}

// Detect confirmation bias
function detectConfirmationBias(reasoning: string, sources?: string[]): AuditCheck {
  const issues: string[] = [];
  let score = 0.8;

  // Check if only bullish or only bearish sources
  const bullishTerms = (reasoning.match(/\b(bullish|long|buy|accumulation|support|breakout|upside)\b/gi) || []).length;
  const bearishTerms = (reasoning.match(/\b(bearish|short|sell|distribution|resistance|breakdown|downside)\b/gi) || []).length;

  const ratio = bullishTerms / (bearishTerms + 1);
  
  if (ratio > 5 || ratio < 0.2) {
    issues.push("One-sided analysis detected - only bullish or bearish evidence cited");
    score = 0.4;
  }

  if (sources && sources.length === 1) {
    issues.push("Single source dependency");
    score = Math.min(score, 0.5);
  }

  if (!/\b(risk|downside|bear case|concern|however|but)\b/i.test(reasoning)) {
    issues.push("No risk assessment or counterarguments found");
    score = Math.min(score, 0.5);
  }

  return {
    score,
    issues: issues.length > 0 ? issues : undefined,
    note: issues.length === 0 ? "Reasoning appears balanced" : "Confirmation bias indicators detected"
  };
}

// Confidence calibration check
function checkConfidenceCalibration(confidence: number, reasoning: string): AuditCheck {
  const issues: string[] = [];
  let score = 0.7;

  // High confidence + weak reasoning = overconfidence
  const reasoningLength = reasoning.length;
  const hasData = /\d+%|\$[\d,]+|\d+\.\d+/i.test(reasoning);
  const hasMultiplePoints = reasoning.split(/[.!?]/).filter(s => s.trim().length > 20).length >= 3;

  if (confidence > 0.8) {
    if (reasoningLength < 200) {
      issues.push("High confidence (>80%) with brief reasoning - potential overconfidence");
      score = 0.4;
    }
    if (!hasData) {
      issues.push("High confidence without quantitative support");
      score = Math.min(score, 0.5);
    }
    if (!hasMultiplePoints) {
      issues.push("High confidence with limited supporting points");
      score = Math.min(score, 0.5);
    }
  }

  // Very low confidence might indicate decision paralysis
  if (confidence < 0.3 && reasoningLength > 300) {
    issues.push("Low confidence despite detailed reasoning - may be overthinking");
    score = 0.6;
  }

  return {
    score,
    issues: issues.length > 0 ? issues : undefined,
    note: issues.length === 0 
      ? `Confidence level (${(confidence * 100).toFixed(0)}%) appears appropriate for reasoning depth`
      : `Confidence-reasoning mismatch detected`
  };
}

// Main audit function
export async function preTradeAudit(data: PreTradeInput): Promise<PreTradeResult> {
  const feedbackId = `pta_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Run all checks
  const [reasoningQuality, anchoringCheck, confirmationBias, confidenceCheck] = await Promise.all([
    analyzeReasoning(data.reasoning, data.position),
    Promise.resolve(detectAnchoring(data.entry_price)),
    Promise.resolve(detectConfirmationBias(data.reasoning, data.sources)),
    Promise.resolve(checkConfidenceCalibration(data.confidence, data.reasoning)),
  ]);

  // Information freshness (basic check)
  const informationFreshness: AuditCheck = {
    score: 0.7,
    note: "Information freshness check requires source timestamps - using default score"
  };

  // Calculate overall score (weighted average)
  const weights = {
    reasoning: 0.35,
    confidence: 0.25,
    anchoring: 0.15,
    confirmation: 0.20,
    freshness: 0.05,
  };

  const overallScore = 
    reasoningQuality.score * weights.reasoning +
    confidenceCheck.score * weights.confidence +
    anchoringCheck.score * weights.anchoring +
    confirmationBias.score * weights.confirmation +
    informationFreshness.score * weights.freshness;

  // Collect cognitive flags
  const cognitiveFlags: string[] = [];
  
  if (reasoningQuality.issues) cognitiveFlags.push(...reasoningQuality.issues);
  if (anchoringCheck.flag) cognitiveFlags.push(anchoringCheck.note || "Anchoring detected");
  if (confirmationBias.issues) cognitiveFlags.push(...confirmationBias.issues);
  if (confidenceCheck.issues) cognitiveFlags.push(...confidenceCheck.issues);

  // Generate recommendation
  let recommendation: string;
  if (overallScore >= 0.75) {
    recommendation = "Reasoning appears sound. Proceed with position sizing appropriate to confidence level.";
  } else if (overallScore >= 0.5) {
    recommendation = "Address flagged issues before entry. Consider reducing position size or gathering more evidence.";
  } else {
    recommendation = "Significant cognitive bias indicators. Recommend revisiting thesis or skipping this trade.";
  }

  return {
    decision_readiness_score: Math.round(overallScore * 100) / 100,
    checks: {
      reasoning_quality: reasoningQuality,
      confidence_calibration: confidenceCheck,
      anchoring_detection: anchoringCheck,
      confirmation_bias: confirmationBias,
      information_freshness: informationFreshness,
    },
    cognitive_flags: cognitiveFlags.slice(0, 8), // Limit to top 8
    recommendation,
    feedback_id: feedbackId,
  };
}
