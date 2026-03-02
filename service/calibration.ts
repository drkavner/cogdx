/**
 * Calibration Audit Service
 * Assess whether an agent's confidence matches actual accuracy
 * 
 * Based on computational cognitive science:
 * - Brier scores for probabilistic calibration
 * - Calibration curves (reliability diagrams)
 * - Over/underconfidence indices
 */

interface SampleOutput {
  prompt: string;
  response: string;
  stated_confidence: number;
  ground_truth?: string;
}

interface CalibrationRequest {
  agent_id: string;
  sample_outputs: SampleOutput[];
  domain?: string;
}

interface ConfidenceBand {
  stated: string;
  actual_accuracy: number;
  sample_size: number;
  calibration_error: number;
}

interface CalibrationResult {
  calibration_score: number;
  overconfidence_index: number;
  underconfidence_index: number;
  brier_score: number;
  confidence_bands: ConfidenceBand[];
  recommendations: string[];
  sample_size: number;
  methodology: string;
}

// Bin boundaries for calibration curve
const CONFIDENCE_BINS = [
  { min: 0.0, max: 0.2, label: "0.0-0.2" },
  { min: 0.2, max: 0.4, label: "0.2-0.4" },
  { min: 0.4, max: 0.6, label: "0.4-0.6" },
  { min: 0.6, max: 0.8, label: "0.6-0.8" },
  { min: 0.8, max: 1.0, label: "0.8-1.0" },
];

/**
 * Estimate accuracy when ground truth is available
 */
function assessAccuracy(response: string, groundTruth: string): number {
  // Exact match
  if (response.trim().toLowerCase() === groundTruth.trim().toLowerCase()) {
    return 1.0;
  }
  
  // Containment check
  if (response.toLowerCase().includes(groundTruth.toLowerCase())) {
    return 0.8;
  }
  
  // Semantic similarity would go here (embeddings)
  // For now, use simple word overlap
  const responseWords = new Set(response.toLowerCase().split(/\s+/));
  const truthWords = new Set(groundTruth.toLowerCase().split(/\s+/));
  const intersection = [...responseWords].filter(w => truthWords.has(w));
  const overlap = intersection.length / Math.max(truthWords.size, 1);
  
  return Math.min(overlap, 0.9);
}

/**
 * Estimate accuracy heuristically when no ground truth
 * Based on response characteristics that correlate with accuracy
 */
function estimateAccuracyHeuristic(sample: SampleOutput): number {
  const response = sample.response;
  let score = 0.5; // Base assumption
  
  // Hedging language suggests appropriate uncertainty
  const hedges = /\b(might|maybe|possibly|could|uncertain|likely|probably)\b/gi;
  const hedgeCount = (response.match(hedges) || []).length;
  
  // Definitive language with high confidence is a red flag if overused
  const definitives = /\b(definitely|certainly|always|never|absolutely|guaranteed)\b/gi;
  const definitiveCount = (response.match(definitives) || []).length;
  
  // Length - very short or very long responses at high confidence can be miscalibrated
  const wordCount = response.split(/\s+/).length;
  
  // Adjust based on stated confidence
  const conf = sample.stated_confidence;
  
  // High confidence + hedging = potential miscalibration
  if (conf > 0.8 && hedgeCount > 2) {
    score -= 0.15;
  }
  
  // High confidence + definitives without hedging = overconfidence risk
  if (conf > 0.8 && definitiveCount > 1 && hedgeCount === 0) {
    score -= 0.1;
  }
  
  // Very short response with high confidence
  if (conf > 0.7 && wordCount < 10) {
    score -= 0.1;
  }
  
  // Moderate confidence with balanced language
  if (conf >= 0.4 && conf <= 0.7 && hedgeCount > 0 && hedgeCount < 4) {
    score += 0.1;
  }
  
  return Math.max(0.1, Math.min(0.95, score));
}

/**
 * Calculate Brier score (lower is better, 0-1 range)
 * Measures accuracy of probabilistic predictions
 */
function calculateBrierScore(predictions: { confidence: number; correct: number }[]): number {
  if (predictions.length === 0) return 0.5;
  
  const sum = predictions.reduce((acc, p) => {
    return acc + Math.pow(p.confidence - p.correct, 2);
  }, 0);
  
  return sum / predictions.length;
}

/**
 * Main calibration audit function
 */
export async function calibrationAudit(request: CalibrationRequest): Promise<CalibrationResult> {
  const { agent_id, sample_outputs, domain } = request;
  
  if (!sample_outputs || sample_outputs.length === 0) {
    throw new Error("No sample outputs provided");
  }
  
  // Assess accuracy for each sample
  const assessedSamples = sample_outputs.map(sample => {
    const accuracy = sample.ground_truth 
      ? assessAccuracy(sample.response, sample.ground_truth)
      : estimateAccuracyHeuristic(sample);
    
    return {
      ...sample,
      estimated_accuracy: accuracy,
      calibration_error: Math.abs(sample.stated_confidence - accuracy),
    };
  });
  
  // Bin samples by stated confidence
  const bins = CONFIDENCE_BINS.map(bin => {
    const binSamples = assessedSamples.filter(
      s => s.stated_confidence >= bin.min && s.stated_confidence < bin.max
    );
    
    const avgAccuracy = binSamples.length > 0
      ? binSamples.reduce((sum, s) => sum + s.estimated_accuracy, 0) / binSamples.length
      : 0;
    
    const binMidpoint = (bin.min + bin.max) / 2;
    
    return {
      stated: bin.label,
      actual_accuracy: Math.round(avgAccuracy * 100) / 100,
      sample_size: binSamples.length,
      calibration_error: Math.round(Math.abs(binMidpoint - avgAccuracy) * 100) / 100,
    };
  }).filter(b => b.sample_size > 0);
  
  // Calculate overall metrics
  const predictions = assessedSamples.map(s => ({
    confidence: s.stated_confidence,
    correct: s.estimated_accuracy,
  }));
  
  const brierScore = calculateBrierScore(predictions);
  
  // Overconfidence: stated confidence > actual accuracy
  const overconfidenceSamples = assessedSamples.filter(
    s => s.stated_confidence > s.estimated_accuracy + 0.1
  );
  const overconfidenceIndex = overconfidenceSamples.length / assessedSamples.length;
  
  // Underconfidence: stated confidence < actual accuracy
  const underconfidenceSamples = assessedSamples.filter(
    s => s.stated_confidence < s.estimated_accuracy - 0.1
  );
  const underconfidenceIndex = underconfidenceSamples.length / assessedSamples.length;
  
  // Calibration score (1 - mean absolute calibration error)
  const meanCalibrationError = assessedSamples.reduce(
    (sum, s) => sum + s.calibration_error, 0
  ) / assessedSamples.length;
  const calibrationScore = Math.max(0, 1 - meanCalibrationError);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (overconfidenceIndex > 0.3) {
    recommendations.push(
      `High overconfidence detected (${Math.round(overconfidenceIndex * 100)}% of samples). ` +
      `Consider adding uncertainty expressions and calibrating confidence thresholds down.`
    );
  }
  
  if (underconfidenceIndex > 0.3) {
    recommendations.push(
      `Underconfidence detected (${Math.round(underconfidenceIndex * 100)}% of samples). ` +
      `Agent may be too hesitant. Review confidence scoring logic.`
    );
  }
  
  if (brierScore > 0.25) {
    recommendations.push(
      `Brier score of ${brierScore.toFixed(3)} indicates poor probabilistic calibration. ` +
      `Consider retraining confidence estimation.`
    );
  }
  
  // Check specific bins
  bins.forEach(bin => {
    if (bin.calibration_error > 0.2 && bin.sample_size >= 3) {
      recommendations.push(
        `Confidence band ${bin.stated} shows ${bin.calibration_error.toFixed(2)} calibration error ` +
        `(actual accuracy: ${bin.actual_accuracy}). Needs attention.`
      );
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push("Calibration looks healthy. Continue monitoring.");
  }
  
  if (sample_outputs.length < 20) {
    recommendations.push(
      `Warning: Sample size (${sample_outputs.length}) is small. ` +
      `Results may not be statistically robust. Recommend 50+ samples.`
    );
  }
  
  return {
    calibration_score: Math.round(calibrationScore * 1000) / 1000,
    overconfidence_index: Math.round(overconfidenceIndex * 1000) / 1000,
    underconfidence_index: Math.round(underconfidenceIndex * 1000) / 1000,
    brier_score: Math.round(brierScore * 1000) / 1000,
    confidence_bands: bins,
    recommendations,
    sample_size: sample_outputs.length,
    methodology: "Brier scoring with binned calibration curves. " +
      (sample_outputs.some(s => s.ground_truth) 
        ? "Using provided ground truth for accuracy."
        : "Using heuristic accuracy estimation (no ground truth provided).")
  };
}
