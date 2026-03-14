/**
 * Pre-Trade Audit - Cognitive checklist for trading decisions
 * Bundle of checks: reasoning quality, confidence calibration, bias detection
 * Enhanced with real market data from CoinGecko and Fear & Greed Index
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || "google/gemini-2.0-flash-001";

// Crypto symbol mapping for CoinGecko
const CRYPTO_SYMBOLS: Record<string, string> = {
  btc: "bitcoin", bitcoin: "bitcoin",
  eth: "ethereum", ethereum: "ethereum",
  sol: "solana", solana: "solana",
  bnb: "binancecoin",
  xrp: "ripple",
  ada: "cardano",
  doge: "dogecoin",
  matic: "matic-network", polygon: "matic-network",
  avax: "avalanche-2",
  link: "chainlink",
  dot: "polkadot",
  uni: "uniswap",
  atom: "cosmos",
  ltc: "litecoin",
};

interface MarketData {
  current_price?: number;
  high_24h?: number;
  low_24h?: number;
  price_change_24h?: number;
  fear_greed_index?: number;
  fear_greed_label?: string;
}

interface PreTradeInput {
  position: string;           // e.g., "long BTC", "short ETH", "buy YES on X"
  confidence: number;         // 0-1
  reasoning: string;          // Agent's reasoning for the trade
  entry_price?: number;       // Optional entry price
  sources?: string[];         // Optional: information sources used
  market_type?: string;       // "crypto" | "prediction" | "forex" | "other"
  asset?: string;             // Optional: explicit asset symbol (btc, eth, etc.)
}

// Extract crypto asset from position string
function extractAsset(position: string): string | null {
  const lower = position.toLowerCase();
  for (const [symbol, id] of Object.entries(CRYPTO_SYMBOLS)) {
    if (lower.includes(symbol)) return id;
  }
  return null;
}

// Fetch crypto market data from CoinGecko (free, no key)
async function fetchCryptoData(assetId: string): Promise<MarketData | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${assetId}?localization=false&tickers=false&community_data=false&developer_data=false`;
    const response = await fetch(url, { 
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      current_price: data.market_data?.current_price?.usd,
      high_24h: data.market_data?.high_24h?.usd,
      low_24h: data.market_data?.low_24h?.usd,
      price_change_24h: data.market_data?.price_change_percentage_24h,
    };
  } catch (e) {
    console.error("CoinGecko fetch failed:", e);
    return null;
  }
}

// Fetch Fear & Greed Index (free, no key)
async function fetchFearGreed(): Promise<{ value: number; label: string } | null> {
  try {
    const response = await fetch("https://api.alternative.me/fng/?limit=1", {
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const fng = data.data?.[0];
    if (fng) {
      return {
        value: parseInt(fng.value),
        label: fng.value_classification,
      };
    }
    return null;
  } catch (e) {
    console.error("Fear & Greed fetch failed:", e);
    return null;
  }
}

interface AuditCheck {
  score: number;
  issues?: string[];
  note?: string;
  flag?: boolean;
}

interface PreTradeResult {
  decision_readiness_score: number;
  market_context?: {
    asset?: string;
    current_price?: number;
    high_24h?: number;
    low_24h?: number;
    price_change_24h?: number;
    fear_greed_index?: number;
    fear_greed_label?: string;
  };
  checks: {
    reasoning_quality: AuditCheck;
    confidence_calibration: AuditCheck;
    anchoring_detection: AuditCheck;
    confirmation_bias: AuditCheck;
    sentiment_divergence: AuditCheck;
    information_freshness: AuditCheck;
  };
  cognitive_flags: string[];
  recommendation: string;
  feedback_id: string;
}

// Enhanced anchoring detection with real market data
function detectAnchoring(entryPrice?: number, marketData?: MarketData | null): AuditCheck {
  if (!entryPrice) {
    return { score: 1.0, note: "No entry price provided - anchoring check skipped" };
  }

  const issues: string[] = [];
  let score = 0.9;

  // Check round number anchoring
  const priceStr = entryPrice.toString();
  const isRoundNumber = entryPrice % 1000 === 0 || entryPrice % 100 === 0;
  const endsInZeros = priceStr.endsWith("000") || priceStr.endsWith("00");
  
  if (isRoundNumber && endsInZeros) {
    issues.push(`Entry price ($${entryPrice.toLocaleString()}) is a round number - psychological anchoring`);
    score = Math.min(score, 0.5);
  }

  // Check anchoring on recent high/low (if we have market data)
  if (marketData?.high_24h && marketData?.low_24h && marketData?.current_price) {
    const range = marketData.high_24h - marketData.low_24h;
    const distToHigh = Math.abs(entryPrice - marketData.high_24h);
    const distToLow = Math.abs(entryPrice - marketData.low_24h);
    
    // Within 2% of 24h high
    if (distToHigh / marketData.high_24h < 0.02) {
      issues.push(`Entry near 24h high ($${marketData.high_24h.toLocaleString()}) - anchoring on recent resistance`);
      score = Math.min(score, 0.4);
    }
    
    // Within 2% of 24h low
    if (distToLow / marketData.low_24h < 0.02) {
      issues.push(`Entry near 24h low ($${marketData.low_24h.toLocaleString()}) - anchoring on recent support`);
      score = Math.min(score, 0.5);
    }

    // Entry far from current price (>5% away)
    const distToCurrent = Math.abs(entryPrice - marketData.current_price) / marketData.current_price;
    if (distToCurrent > 0.05) {
      issues.push(`Entry ($${entryPrice.toLocaleString()}) is ${(distToCurrent * 100).toFixed(1)}% from current price ($${marketData.current_price.toLocaleString()})`);
    }
  }

  if (issues.length === 0) {
    return { 
      score: 0.9, 
      note: marketData?.current_price 
        ? `Entry price reasonable vs. current ($${marketData.current_price.toLocaleString()})`
        : "No obvious anchoring patterns detected"
    };
  }

  return {
    score,
    flag: true,
    issues,
    note: "Potential price anchoring detected"
  };
}

// Detect sentiment divergence (agent vs. market)
function detectSentimentDivergence(
  position: string, 
  confidence: number,
  fearGreed?: { value: number; label: string } | null
): AuditCheck {
  if (!fearGreed) {
    return { score: 0.7, note: "Market sentiment data unavailable" };
  }

  const issues: string[] = [];
  let score = 0.8;

  const isLong = /\b(long|buy|bullish)\b/i.test(position);
  const isShort = /\b(short|sell|bearish)\b/i.test(position);

  // Extreme Fear (0-25) + Bullish position = contrarian
  if (isLong && fearGreed.value <= 25) {
    if (confidence > 0.7) {
      issues.push(`High confidence (${(confidence * 100).toFixed(0)}%) bullish position during ${fearGreed.label} (${fearGreed.value}/100)`);
      issues.push("Contrarian positions during extreme fear historically require stronger thesis");
      score = 0.4;
    } else {
      issues.push(`Bullish position during ${fearGreed.label} - contrarian setup`);
      score = 0.6;
    }
  }

  // Extreme Greed (75-100) + Bullish position = herd following
  if (isLong && fearGreed.value >= 75) {
    issues.push(`Bullish during ${fearGreed.label} (${fearGreed.value}/100) - following the crowd`);
    issues.push("High greed often precedes corrections");
    score = 0.5;
  }

  // Extreme Greed + Bearish = contrarian (potentially smart)
  if (isShort && fearGreed.value >= 75) {
    if (confidence > 0.8) {
      issues.push(`High confidence bearish during ${fearGreed.label} - timing tops is difficult`);
      score = 0.5;
    }
  }

  // Extreme Fear + Bearish = herd following
  if (isShort && fearGreed.value <= 25) {
    issues.push(`Bearish during ${fearGreed.label} - following panic`);
    issues.push("Extreme fear often marks local bottoms");
    score = 0.5;
  }

  if (issues.length === 0) {
    return {
      score: 0.8,
      note: `Position aligns with market sentiment (Fear & Greed: ${fearGreed.value} - ${fearGreed.label})`
    };
  }

  return {
    score,
    flag: score < 0.6,
    issues,
    note: `Sentiment divergence detected (Fear & Greed: ${fearGreed.value})`
  };
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

  // Detect asset from position or explicit field
  const assetId = data.asset ? CRYPTO_SYMBOLS[data.asset.toLowerCase()] || data.asset : extractAsset(data.position);
  
  // Fetch market data in parallel
  const [marketData, fearGreed] = await Promise.all([
    assetId ? fetchCryptoData(assetId) : Promise.resolve(null),
    fetchFearGreed(),
  ]);

  // Run all checks with market data
  const [reasoningQuality, anchoringCheck, confirmationBias, confidenceCheck, sentimentCheck] = await Promise.all([
    analyzeReasoning(data.reasoning, data.position),
    Promise.resolve(detectAnchoring(data.entry_price, marketData)),
    Promise.resolve(detectConfirmationBias(data.reasoning, data.sources)),
    Promise.resolve(checkConfidenceCalibration(data.confidence, data.reasoning)),
    Promise.resolve(detectSentimentDivergence(data.position, data.confidence, fearGreed)),
  ]);

  // Information freshness (basic check)
  const informationFreshness: AuditCheck = {
    score: 0.7,
    note: "Information freshness check requires source timestamps - using default score"
  };

  // Build market context
  const marketContext = (marketData || fearGreed) ? {
    asset: assetId || undefined,
    current_price: marketData?.current_price,
    high_24h: marketData?.high_24h,
    low_24h: marketData?.low_24h,
    price_change_24h: marketData?.price_change_24h,
    fear_greed_index: fearGreed?.value,
    fear_greed_label: fearGreed?.label,
  } : undefined;

  // Calculate overall score (weighted average)
  const weights = {
    reasoning: 0.30,
    confidence: 0.20,
    anchoring: 0.15,
    confirmation: 0.15,
    sentiment: 0.15,
    freshness: 0.05,
  };

  const overallScore = 
    reasoningQuality.score * weights.reasoning +
    confidenceCheck.score * weights.confidence +
    anchoringCheck.score * weights.anchoring +
    confirmationBias.score * weights.confirmation +
    sentimentCheck.score * weights.sentiment +
    informationFreshness.score * weights.freshness;

  // Collect cognitive flags
  const cognitiveFlags: string[] = [];
  
  if (reasoningQuality.issues) cognitiveFlags.push(...reasoningQuality.issues);
  if (anchoringCheck.flag) cognitiveFlags.push(...(anchoringCheck.issues || []));
  if (confirmationBias.issues) cognitiveFlags.push(...confirmationBias.issues);
  if (confidenceCheck.issues) cognitiveFlags.push(...confidenceCheck.issues);
  if (sentimentCheck.issues) cognitiveFlags.push(...sentimentCheck.issues);

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
    market_context: marketContext,
    checks: {
      reasoning_quality: reasoningQuality,
      confidence_calibration: confidenceCheck,
      anchoring_detection: anchoringCheck,
      confirmation_bias: confirmationBias,
      sentiment_divergence: sentimentCheck,
      information_freshness: informationFreshness,
    },
    cognitive_flags: cognitiveFlags.slice(0, 10), // Limit to top 10
    recommendation,
    feedback_id: feedbackId,
  };
}
