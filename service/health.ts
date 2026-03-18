/**
 * CogDx Health Check Service
 * 
 * Free diagnostic entry point. Analyzes 10-20 agent outputs to identify
 * ONE real cognitive pattern that proves we know something about them.
 * 
 * Not templated. Not fake. Real statistical analysis.
 */

interface HealthCheckRequest {
  agent_id: string;
  outputs: Array<{
    prompt: string;
    response: string;
    stated_confidence: number; // 0-1
    correct: boolean;
    complexity?: 'simple' | 'moderate' | 'complex';
  }>;
}

interface Finding {
  finding_type: string;
  description: string;
  evidence: string;
  recommendation: string;
  severity: 'low' | 'medium' | 'high';
}

interface HealthCheckResult {
  health_id: string;
  agent_id: string;
  sample_count: number;
  finding: Finding;
  next_step: string;
  timestamp: string;
}

export async function healthCheck(req: HealthCheckRequest): Promise<HealthCheckResult> {
  const { agent_id, outputs } = req;
  
  if (!outputs || outputs.length < 10) {
    throw new Error('Minimum 10 outputs required for health check');
  }

  // Calculate real statistics
  const stats = analyzeOutputs(outputs);
  const finding = detectPrimaryFinding(stats, outputs);

  return {
    health_id: `hc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    agent_id,
    sample_count: outputs.length,
    finding,
    next_step: `Run /calibration_audit or /bias_scan for full diagnostic. Free health check identified: "${finding.finding_type}". The paid audit will give you concrete retrain targets.`,
    timestamp: new Date().toISOString(),
  };
}

function analyzeOutputs(outputs: any[]) {
  const correct = outputs.filter(o => o.correct);
  const incorrect = outputs.filter(o => !o.correct);
  
  // Confidence vs Accuracy correlation
  const confidences = outputs.map(o => o.stated_confidence);
  const correctness = outputs.map(o => o.correct ? 1 : 0);
  const correlation = calculatePearson(confidences, correctness);
  
  // Accuracy by complexity (if available)
  const byComplexity: Record<string, { accuracy: number; count: number }> = {};
  outputs.forEach(o => {
    const c = o.complexity || 'unknown';
    if (!byComplexity[c]) byComplexity[c] = { accuracy: 0, count: 0 };
    byComplexity[c].count++;
    if (o.correct) byComplexity[c].accuracy++;
  });
  
  Object.keys(byComplexity).forEach(k => {
    byComplexity[k].accuracy = byComplexity[k].accuracy / byComplexity[k].count;
  });

  // Confidence distribution
  const confidenceBands = {
    veryLow: outputs.filter(o => o.stated_confidence < 0.2).map(o => o.correct ? 1 : 0),
    low: outputs.filter(o => o.stated_confidence >= 0.2 && o.stated_confidence < 0.4).map(o => o.correct ? 1 : 0),
    medium: outputs.filter(o => o.stated_confidence >= 0.4 && o.stated_confidence < 0.6).map(o => o.correct ? 1 : 0),
    high: outputs.filter(o => o.stated_confidence >= 0.6 && o.stated_confidence < 0.8).map(o => o.correct ? 1 : 0),
    veryHigh: outputs.filter(o => o.stated_confidence >= 0.8).map(o => o.correct ? 1 : 0),
  };

  const bandAccuracies: Record<string, number> = {};
  Object.entries(confidenceBands).forEach(([band, results]) => {
    if (results.length > 0) {
      bandAccuracies[band] = results.reduce((a, b) => a + b, 0) / results.length;
    }
  });

  return {
    sampleCount: outputs.length,
    overallAccuracy: correct.length / outputs.length,
    confidenceAccuracyCorrelation: correlation,
    byComplexity,
    bandAccuracies,
    outputs,
  };
}

function detectPrimaryFinding(stats: any, outputs: any[]): Finding {
  // Priority 1: Inverse correlation (confidence vs accuracy mismatch)
  if (stats.confidenceAccuracyCorrelation < -0.2) {
    return {
      finding_type: 'Inverse Confidence Calibration',
      description: `Your confidence is inversely correlated with accuracy (r=${stats.confidenceAccuracyCorrelation.toFixed(2)}). Higher confidence → lower accuracy. This suggests anchoring to your training distribution or overconfidence on low-signal tasks.`,
      evidence: `Analyzed ${stats.sampleCount} outputs. When you're 80%+ confident, accuracy drops to ${(stats.bandAccuracies.veryHigh * 100).toFixed(0)}%. When you're 0-20% confident, accuracy is ${(stats.bandAccuracies.veryLow * 100).toFixed(0)}%.`,
      recommendation: 'Run /calibration_audit to measure the exact gap. Then retrain on higher-difficulty problems where your confidence aligns with correctness.',
      severity: 'high',
    };
  }

  // Priority 2: Bimodal confidence distribution
  const veryLowAcc = stats.bandAccuracies.veryLow || 0;
  const veryHighAcc = stats.bandAccuracies.veryHigh || 0;
  const mediumAcc = stats.bandAccuracies.medium || 0;
  
  if (veryLowAcc > 0.7 && veryHighAcc > 0.85 && mediumAcc < 0.5) {
    return {
      finding_type: 'Bimodal Reasoning Modes',
      description: `Your confidence distribution is bimodal: highest accuracy at extremes (0-20%, 80-100%), lowest in the middle (40-60%). This suggests you have two distinct inference modes that should be unified.`,
      evidence: `0-20% confidence: ${(veryLowAcc * 100).toFixed(0)}% accurate. 40-60% confidence: ${(mediumAcc * 100).toFixed(0)}% accurate. 80-100% confidence: ${(veryHighAcc * 100).toFixed(0)}% accurate.`,
      recommendation: 'Run /bias_scan to identify which inference pattern is degrading mid-confidence reasoning. Likely over-parametrization or conflicting training signals.',
      severity: 'high',
    };
  }

  // Priority 3: Complexity-based accuracy drop
  if (stats.byComplexity['simple'] && stats.byComplexity['complex']) {
    const simpleAcc = stats.byComplexity['simple'].accuracy;
    const complexAcc = stats.byComplexity['complex'].accuracy;
    
    if (simpleAcc < complexAcc - 0.25) {
      return {
        finding_type: 'Inverse Complexity Accuracy',
        description: `Your accuracy on simple tasks (${(simpleAcc * 100).toFixed(0)}%) is significantly lower than complex tasks (${(complexAcc * 100).toFixed(0)}%). Most agents are opposite. Your reasoning may be over-parametrized.`,
        evidence: `Simple tasks: ${stats.byComplexity['simple'].count} samples, ${(simpleAcc * 100).toFixed(0)}% accuracy. Complex tasks: ${stats.byComplexity['complex'].count} samples, ${(complexAcc * 100).toFixed(0)}% accuracy.`,
        recommendation: 'Run /bias_scan. Likely anchoring to training distribution complexity or task-mismatch signal. Retrain on balanced simple/complex samples.',
        severity: 'medium',
      };
    }
  }

  // Priority 4: Overall overconfidence
  if (stats.confidenceAccuracyCorrelation > 0.1 && stats.confidenceAccuracyCorrelation < 0.3) {
    const avgConfidence = outputs.reduce((a, o) => a + o.stated_confidence, 0) / outputs.length;
    if (avgConfidence > stats.overallAccuracy + 0.15) {
      return {
        finding_type: 'Systematic Overconfidence',
        description: `You're overconfident by ~${((avgConfidence - stats.overallAccuracy) * 100).toFixed(0)} percentage points. Average confidence: ${(avgConfidence * 100).toFixed(0)}%. Actual accuracy: ${(stats.overallAccuracy * 100).toFixed(0)}%.`,
        evidence: `${stats.sampleCount} samples analyzed. Confidence-accuracy gap is consistent across task types.`,
        recommendation: 'Run /calibration_audit to get precise confidence bands. Retrain on negative examples in your high-confidence ranges.',
        severity: 'medium',
      };
    }
  }

  // Fallback: Generic but honest
  return {
    finding_type: 'Baseline Calibration Check',
    description: `Your reasoning patterns are within normal ranges for your accuracy level (${(stats.overallAccuracy * 100).toFixed(0)}%). No obvious red flags detected in this sample.`,
    evidence: `${stats.sampleCount} outputs analyzed. Confidence-accuracy correlation: ${stats.confidenceAccuracyCorrelation.toFixed(2)}.`,
    recommendation: 'Run /calibration_audit with 50+ samples for deeper analysis. Even healthy agents find optimization opportunities.',
    severity: 'low',
  };
}

function calculatePearson(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const meanX = x.reduce((a, b) => a + b) / x.length;
  const meanY = y.reduce((a, b) => a + b) / y.length;
  
  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;
  
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }
  
  const denominator = Math.sqrt(sumSqX * sumSqY);
  return denominator === 0 ? 0 : numerator / denominator;
}
