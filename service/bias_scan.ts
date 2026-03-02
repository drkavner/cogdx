/**
 * Bias Scan Service v2
 * Unified Cognitive + Statistical Bias Detection
 * 
 * Based on:
 * - Kahneman & Tversky heuristics and biases
 * - Wang & Redelmeier (2024) - AI cognitive bias research
 * - IBM AI Fairness 360 methodology
 * - PRIOR framework for inference-level vulnerabilities
 */

interface OutputSample {
  prompt: string;
  response: string;
  context?: Record<string, any>;
  group_label?: string; // For statistical analysis
  outcome?: number; // For statistical analysis (0/1 or continuous)
}

interface BiasScanRequest {
  agent_id: string;
  outputs: OutputSample[];
  mode?: "cognitive" | "statistical" | "both";
  bias_types?: string[];
  protected_attribute?: string;
}

interface CognitiveBiasDetection {
  type: string;
  name: string;
  severity: number;
  evidence: string[];
  affected_outputs: number[];
  mitigation: string;
  cognitive_explanation: string;
}

interface StatisticalBiasResult {
  metric: string;
  groups: Record<string, number>;
  disparity: number;
  passes_80_rule: boolean;
  interpretation: string;
}

interface BiasScanResult {
  mode: string;
  cognitive_biases?: CognitiveBiasDetection[];
  statistical_biases?: StatisticalBiasResult[];
  overall_bias_score: number;
  recommendations: string[];
  methodology: string;
  sample_size: number;
  key_finding?: string;
}

// ============================================
// COGNITIVE BIAS PATTERNS
// Based on Wang & Redelmeier (2024) + Kahneman
// ============================================

const COGNITIVE_BIAS_PATTERNS = {
  anchoring: {
    name: "Anchoring Bias",
    description: "Over-reliance on first piece of information encountered",
    patterns: [
      /\b(initially|first|originally|started with|began with)\b.*\b(so|therefore|thus|hence)\b/gi,
      /\b(as mentioned|as stated|as noted)\s+(earlier|before|previously|above)\b/gi,
      /\b(given that|since|because)\s+.*\b(must be|should be|is likely)\b/gi,
    ],
    mitigations: [
      "Consider the problem from multiple starting points",
      "Explicitly challenge initial assumptions",
      "Generate alternatives before committing to anchor-based conclusions",
    ],
  },
  
  framing: {
    name: "Framing Effect",
    description: "Influenced by how information is presented (mortality vs survival rates)",
    patterns: [
      /\b(only|just|merely)\s+\d+%/gi,
      /\b(as much as|up to|as high as)\s+\d+/gi,
      /\b(risk|danger|threat)\b.*\b(high|significant|serious)/gi,
      /\b(chance|opportunity|benefit)\b.*\b(low|small|minimal)/gi,
    ],
    mitigations: [
      "Reframe the problem in multiple ways (gain vs loss)",
      "Convert to absolute numbers when given percentages",
      "Identify emotionally charged language and neutralize",
    ],
  },
  
  availability: {
    name: "Availability Heuristic",
    description: "Overweighting easily recalled or recent examples",
    patterns: [
      /\b(for example|for instance|such as|like)\b.*\b(famous|well-known|notable|recent)\b/gi,
      /\b(everyone knows|it's common knowledge|typically|usually)\b/gi,
      /\b(I (remember|recall|think of)|comes to mind)\b/gi,
      /\b(viral|trending|in the news)\b/gi,
    ],
    mitigations: [
      "Seek base rate statistics rather than examples",
      "Consider less memorable but more representative cases",
      "Question whether recalled examples are representative",
    ],
  },

  confirmation: {
    name: "Confirmation Bias",
    description: "Seeking/interpreting information that confirms existing beliefs",
    patterns: [
      /\b(this confirms|this supports|this proves|as expected|unsurprisingly)\b/gi,
      /\b(clearly|obviously|evidently|of course)\b/gi,
      /\b(consistent with|in line with|aligns with)\s+(my|our|the)\s+(view|belief|expectation)/gi,
    ],
    mitigations: [
      "Actively seek disconfirming evidence",
      "Steelman opposing viewpoints",
      "Ask 'what would change my mind?'",
    ],
  },

  hindsight: {
    name: "Hindsight Bias",
    description: "Believing past events were predictable after knowing the outcome",
    patterns: [
      /\b(obviously|clearly|should have|could have|in retrospect)\b.*\b(known|seen|predicted)\b/gi,
      /\b(it was (clear|obvious|inevitable)|anyone could see)\b/gi,
      /\b(I (knew|predicted|expected) (it|this|that))\b/gi,
    ],
    mitigations: [
      "Document predictions before outcomes are known",
      "Consider what evidence was actually available at decision time",
      "Acknowledge genuine uncertainty in past situations",
    ],
  },

  base_rate_neglect: {
    name: "Base Rate Neglect",
    description: "Ignoring prior probabilities when making predictions",
    patterns: [
      // Absence of base rate language when making predictions
      /\b(likely|probably|might|could)\b/gi, // Flag if present WITHOUT base rate context
    ],
    check_for_absence: [
      /\b(base rate|prior probability|prevalence|incidence|background rate)\b/gi,
      /\b(\d+%? of (people|cases|patients)|out of every \d+)\b/gi,
    ],
    mitigations: [
      "Always consider the base rate before specific evidence",
      "Use Bayesian reasoning explicitly",
      "Ask 'how common is this in the general population?'",
    ],
  },

  overconfidence: {
    name: "Overconfidence Bias",
    description: "Excessive confidence in own judgments",
    patterns: [
      /\b(definitely|certainly|absolutely|undoubtedly|without question)\b/gi,
      /\b(I('m| am) (sure|certain|confident)|no doubt)\b/gi,
      /\b(guaranteed|100%|always|never)\b/gi,
    ],
    mitigations: [
      "Assign explicit probability estimates",
      "Consider base rates of being wrong",
      "Seek external calibration feedback",
    ],
  },

  recency: {
    name: "Recency Bias",
    description: "Overweighting recent events or information",
    patterns: [
      /\b(recently|lately|just now|in recent|most recent)\b/gi,
      /\b(current|latest|newest|modern|today's)\b.*\b(shows|suggests|indicates)\b/gi,
      /\b(things have changed|it's different now|nowadays)\b/gi,
    ],
    mitigations: [
      "Consider longer historical trends",
      "Weight older evidence appropriately",
      "Ask if recent events are anomalies or patterns",
    ],
  },

  sunk_cost: {
    name: "Sunk Cost Fallacy",
    description: "Continuing due to past investment rather than future value",
    patterns: [
      /\b(already|invested|spent|committed)\b.*\b(so|therefore|should continue)\b/gi,
      /\b(too late to|can't stop now|come this far)\b/gi,
      /\b(waste|wasted|throw away)\b.*\b(effort|time|money|work)\b/gi,
    ],
    mitigations: [
      "Evaluate decisions based only on future costs/benefits",
      "Ask 'would I start this today with what I know now?'",
      "Separate emotional attachment from rational analysis",
    ],
  },

  occams_razor_fallacy: {
    name: "Occam's Razor Fallacy",
    description: "Oversimplifying complex problems inappropriately",
    patterns: [
      /\b(simply|just|merely|only)\s+(need to|have to|must)\b/gi,
      /\b(the (simple|obvious|straightforward) (answer|solution|explanation))\b/gi,
      /\b(it's (just|simply|basically))\b/gi,
    ],
    mitigations: [
      "Consider whether simplicity is appropriate for the problem complexity",
      "Enumerate factors that might be overlooked",
      "Ask 'what am I missing?'",
    ],
  },
};

type CognitiveBiasType = keyof typeof COGNITIVE_BIAS_PATTERNS;

// ============================================
// COGNITIVE BIAS DETECTION
// ============================================

function detectCognitiveBiasInOutput(
  output: OutputSample,
  biasType: CognitiveBiasType
): { detected: boolean; evidence: string[]; severity: number } {
  const bias = COGNITIVE_BIAS_PATTERNS[biasType];
  const text = output.response;
  const evidence: string[] = [];
  let matchCount = 0;

  // Check for presence of bias patterns
  for (const pattern of bias.patterns) {
    const matches = text.match(pattern);
    if (matches) {
      matchCount += matches.length;
      matches.forEach(match => {
        if (!evidence.includes(match) && evidence.length < 3) {
          evidence.push(`"...${match.trim()}..."`);
        }
      });
    }
  }

  // Special handling for base_rate_neglect: check for ABSENCE of base rate language
  if (biasType === "base_rate_neglect" && bias.check_for_absence) {
    const hasPrediction = bias.patterns.some(p => text.match(p));
    const hasBaseRate = bias.check_for_absence.some(p => text.match(p));
    if (hasPrediction && !hasBaseRate) {
      matchCount += 2;
      evidence.push("Prediction made without base rate consideration");
    }
  }

  // Severity based on match density
  const wordCount = text.split(/\s+/).length;
  const density = matchCount / Math.max(wordCount / 100, 1);
  const severity = Math.min(density * 0.3, 1);

  return {
    detected: matchCount > 0,
    evidence,
    severity,
  };
}

function runCognitiveAnalysis(outputs: OutputSample[], biasTypes: string[]): CognitiveBiasDetection[] {
  const biasesToCheck: CognitiveBiasType[] = biasTypes.includes("all")
    ? Object.keys(COGNITIVE_BIAS_PATTERNS) as CognitiveBiasType[]
    : biasTypes.filter(t => t in COGNITIVE_BIAS_PATTERNS) as CognitiveBiasType[];

  const biasSeverities: Record<string, { total: number; count: number; affected: number[]; evidence: string[] }> = {};

  outputs.forEach((output, idx) => {
    biasesToCheck.forEach(biasType => {
      const result = detectCognitiveBiasInOutput(output, biasType);
      if (result.detected) {
        if (!biasSeverities[biasType]) {
          biasSeverities[biasType] = { total: 0, count: 0, affected: [], evidence: [] };
        }
        biasSeverities[biasType].total += result.severity;
        biasSeverities[biasType].count += 1;
        biasSeverities[biasType].affected.push(idx);
        biasSeverities[biasType].evidence.push(...result.evidence);
      }
    });
  });

  const detections: CognitiveBiasDetection[] = [];
  for (const [biasType, data] of Object.entries(biasSeverities)) {
    const bias = COGNITIVE_BIAS_PATTERNS[biasType as CognitiveBiasType];
    const avgSeverity = data.total / data.count;
    const prevalence = data.affected.length / outputs.length;

    if (prevalence > 0.1 || avgSeverity > 0.3) {
      detections.push({
        type: biasType,
        name: bias.name,
        severity: Math.round(avgSeverity * 100) / 100,
        evidence: [...new Set(data.evidence)].slice(0, 3),
        affected_outputs: data.affected,
        mitigation: bias.mitigations[0],
        cognitive_explanation: bias.description,
      });
    }
  }

  return detections.sort((a, b) => b.severity - a.severity);
}

// ============================================
// STATISTICAL BIAS DETECTION
// ============================================

function runStatisticalAnalysis(outputs: OutputSample[]): StatisticalBiasResult[] {
  // Group outputs by label
  const groups: Record<string, { count: number; positives: number }> = {};
  
  outputs.forEach(output => {
    const label = output.group_label || "unknown";
    const outcome = output.outcome ?? 0;
    
    if (!groups[label]) {
      groups[label] = { count: 0, positives: 0 };
    }
    groups[label].count++;
    if (outcome > 0) groups[label].positives++;
  });

  const results: StatisticalBiasResult[] = [];
  const groupNames = Object.keys(groups).filter(g => g !== "unknown");
  
  if (groupNames.length < 2) {
    return [{
      metric: "demographic_parity",
      groups: {},
      disparity: 0,
      passes_80_rule: true,
      interpretation: "Insufficient group data for statistical analysis. Provide group_label and outcome fields.",
    }];
  }

  // Calculate positive rates per group
  const rates: Record<string, number> = {};
  groupNames.forEach(g => {
    rates[g] = groups[g].positives / groups[g].count;
  });

  // Demographic parity
  const rateValues = Object.values(rates);
  const maxRate = Math.max(...rateValues);
  const minRate = Math.min(...rateValues);
  const disparity = maxRate > 0 ? minRate / maxRate : 1;

  results.push({
    metric: "demographic_parity",
    groups: rates,
    disparity: Math.round(disparity * 1000) / 1000,
    passes_80_rule: disparity >= 0.8,
    interpretation: disparity >= 0.8 
      ? "Positive outcome rates are similar across groups (passes 80% rule)"
      : `Disparity detected: ratio = ${disparity.toFixed(2)} (below 0.8 threshold)`,
  });

  return results;
}

// ============================================
// MAIN EXPORT
// ============================================

export async function biasScan(request: BiasScanRequest): Promise<BiasScanResult> {
  const { agent_id, outputs, mode = "cognitive", bias_types = ["all"] } = request;

  if (!outputs || outputs.length === 0) {
    throw new Error("No outputs provided for bias scan");
  }

  const result: BiasScanResult = {
    mode,
    overall_bias_score: 0,
    recommendations: [],
    methodology: "",
    sample_size: outputs.length,
  };

  // Run cognitive analysis
  if (mode === "cognitive" || mode === "both") {
    const cognitiveResults = runCognitiveAnalysis(outputs, bias_types);
    result.cognitive_biases = cognitiveResults;
    
    if (cognitiveResults.length > 0) {
      result.overall_bias_score += cognitiveResults.reduce(
        (sum, b) => sum + b.severity * (b.affected_outputs.length / outputs.length),
        0
      ) / cognitiveResults.length;
    }
  }

  // Run statistical analysis
  if (mode === "statistical" || mode === "both") {
    const statisticalResults = runStatisticalAnalysis(outputs);
    result.statistical_biases = statisticalResults;
    
    const failedMetrics = statisticalResults.filter(r => !r.passes_80_rule);
    if (failedMetrics.length > 0) {
      result.overall_bias_score += 0.3 * failedMetrics.length;
    }
  }

  // Normalize overall score
  result.overall_bias_score = Math.min(Math.round(result.overall_bias_score * 1000) / 1000, 1);

  // Generate recommendations
  if (result.cognitive_biases && result.cognitive_biases.length > 0) {
    result.cognitive_biases.slice(0, 3).forEach(b => {
      result.recommendations.push(`${b.name}: ${b.mitigation}`);
    });
  }

  if (result.statistical_biases) {
    result.statistical_biases.filter(s => !s.passes_80_rule).forEach(s => {
      result.recommendations.push(`Statistical disparity in ${s.metric}: Review data collection and model fairness`);
    });
  }

  if (result.recommendations.length === 0) {
    result.recommendations.push("No significant biases detected. Continue monitoring.");
  }

  if (outputs.length < 20) {
    result.recommendations.push(`Sample size (${outputs.length}) is small. Recommend 20+ outputs for reliable detection.`);
  }

  // Key finding from research
  result.key_finding = "Research shows forewarning agents about bias only reduces it by ~7% (Wang & Redelmeier 2024). External diagnostics like this scan are essential.";

  // Methodology note
  result.methodology = mode === "both"
    ? "Combined cognitive (pattern-based, Kahneman & Tversky taxonomy) and statistical (demographic parity, 80% rule) analysis."
    : mode === "cognitive"
    ? "Pattern-based cognitive bias detection using Kahneman & Tversky taxonomy with linguistic markers."
    : "Statistical fairness analysis using demographic parity and disparate impact (80% rule).";

  return result;
}
