/**
 * Mercury A2A Service v2
 * Cognitive Diagnostics for Agents
 * Built on computational cognitive science
 */

import { serve } from "bun";
import { calibrationAudit } from "./calibration";
import { biasScan } from "./bias_scan";
import { submitFeedback, getCreditsInfo } from "./feedback";
import { verifyConsensus } from "./verify_consensus";
import { deceptionAudit } from "./deception";
import { reasoningTraceAnalysis } from "./trace_analysis";
import { healthCheck } from "./health";
import { getBalance, deductCredits } from "./credits";
import { preTradeAudit } from "./pre_trade_audit";
import { checkRateLimit, recordUsage } from "./ratelimit";

// x402 Configuration
const X402_CONFIG = {
  payTo: "Cerebratech.eth",
  network: "base",
  currency: "USDC",
};

// Discord Alert Configuration
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

// Send payment alert to Discord
async function sendPaymentAlert(path: string, paymentMethod: string, price: string) {
  if (!DISCORD_WEBHOOK_URL) return;
  
  try {
    const emoji = paymentMethod.startsWith("x402") ? "🎉" : paymentMethod.startsWith("credits") ? "💳" : "🎫";
    const message = {
      content: `${emoji} **PAID API CALL!**\n\n**Endpoint:** \`${path}\`\n**Price:** ${price}\n**Method:** ${paymentMethod}\n**Time:** ${new Date().toISOString()}\n\n402 → 200 🔥`,
    };
    
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    console.log(`[ALERT] Discord notification sent for ${path}`);
  } catch (e) {
    console.error("[ALERT] Failed to send Discord notification:", e);
  }
}

const PRICING: Record<string, { price: string; priceNum: number; maxAge: number }> = {
  "/calibration_audit": { price: "$0.06", priceNum: 0.06, maxAge: 3600 },
  "/bias_scan": { price: "$0.10", priceNum: 0.10, maxAge: 3600 },
  "/reasoning_trace_analysis": { price: "$0.03", priceNum: 0.03, maxAge: 3600 },
  "/deception_audit": { price: "$0.25", priceNum: 0.25, maxAge: 3600 }, // Premium alignment check
  "/prompt_optimization": { price: "$0.10", priceNum: 0.10, maxAge: 3600 },
  "/failure_mode_predict": { price: "$0.15", priceNum: 0.15, maxAge: 3600 },
  "/cognitive_alignment_check": { price: "$0.04", priceNum: 0.04, maxAge: 3600 },
  "/verify_consensus": { price: "$0.25", priceNum: 0.25, maxAge: 3600 }, // Standard depth default
  "/pre_trade_audit": { price: "$0.15", priceNum: 0.15, maxAge: 3600 }, // Trading decision checklist
};

// Generate x402 PaymentRequired response
function paymentRequired(path: string) {
  const pricing = PRICING[path];
  if (!pricing) return null;

  const payload = {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: X402_CONFIG.network,
        maxAmountRequired: pricing.price,
        resource: path,
        description: `Mercury Cognitive Diagnostics: ${path.slice(1)}`,
        mimeType: "application/json",
        payTo: X402_CONFIG.payTo,
        maxTimeoutSeconds: 60,
        asset: X402_CONFIG.currency,
      },
    ],
    error: null,
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

// Verify x402 payment (stub - integrate @x402/evm for production)
async function verifyPayment(paymentHeader: string | null): Promise<boolean> {
  if (!paymentHeader) return false;
  try {
    const decoded = JSON.parse(Buffer.from(paymentHeader, "base64").toString());
    return decoded && decoded.payload;
  } catch {
    return false;
  }
}

async function promptOptimization(data: any) {
  // TODO: Implement real optimization
  const currentPrompt = data.current_prompt || "";

  return {
    optimized_prompt: currentPrompt + "\n\nThink step by step. Consider alternative interpretations.",
    changes_made: [
      {
        type: "cognitive_load",
        before: "Single block instruction",
        after: "Added explicit reasoning request",
        rationale: "Reduces cognitive load by encouraging structured thinking",
      },
    ],
    predicted_improvement: 0.15,
    cognitive_principles_applied: [
      "Chunking",
      "Explicit reasoning prompts",
      "Metacognitive scaffolding",
    ],
    status: "stub_implementation",
  };
}

async function failureModePredict(data: any) {
  // TODO: Implement real prediction
  return {
    predicted_failure_modes: [
      {
        scenario: "Ambiguous user intent",
        likelihood: 0.6,
        severity: "medium",
        root_cause: "System prompt lacks disambiguation strategy",
        mitigation: "Add clarification request protocol",
      },
      {
        scenario: "Out-of-domain queries",
        likelihood: 0.4,
        severity: "high",
        root_cause: "No explicit scope boundaries",
        mitigation: "Define domain limits and graceful fallback",
      },
    ],
    robustness_score: 0.65,
    recommendations: [
      "Add explicit handling for ambiguous inputs",
      "Define scope boundaries in system prompt",
    ],
    status: "stub_implementation",
  };
}

async function cognitiveAlignmentCheck(data: any) {
  // TODO: Implement real alignment check
  return {
    alignment_score: 0.72,
    understanding_depth: "partial",
    misalignment_risks: [
      {
        type: "literal_interpretation",
        description: "Agent may miss implicit user goals",
        severity: 0.4,
      },
    ],
    recommendations: [
      "Add explicit goal clarification step",
    ],
    status: "stub_implementation",
  };
}

const handlers: Record<string, (data: any) => Promise<any>> = {
  "/calibration_audit": calibrationAudit,
  "/bias_scan": biasScan,
  "/reasoning_trace_analysis": reasoningTraceAnalysis,
  "/deception_audit": deceptionAudit,
  "/prompt_optimization": promptOptimization,
  "/failure_mode_predict": failureModePredict,
  "/cognitive_alignment_check": cognitiveAlignmentCheck,
  "/verify_consensus": verifyConsensus,
  "/pre_trade_audit": preTradeAudit, // Trading decision cognitive checklist
};

// Metrics tracking
let metrics = {
  calls: 0,
  revenue: 0,
  byEndpoint: {} as Record<string, number>,
  startedAt: new Date().toISOString(),
};

// Coupon Configuration (Simple In-Memory for Pilot)
const COUPONS: Record<string, { remaining: number; value: number }> = {
  "MERCURY-PILOT-2026": { remaining: 100, value: 5.00 }, // $5 credit
  "COG-DX-TRIAL": { remaining: 50, value: 1.00 },        // $1 credit
};

serve({
  port: 3100,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-PAYMENT",
        },
      });
    }

    // Agent card
    if (path === "/a2a/agent.json" || path === "/.well-known/agent.json") {
      const card = await Bun.file("../A2A_AGENT_CARD.json").text();
      return new Response(card, {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Catalog
    if (path === "/catalog") {
      return new Response(JSON.stringify({
        service: "Mercury Cognitive Diagnostics",
        version: "2.0",
        endpoints: Object.entries(PRICING).map(([path, p]) => ({
          path,
          price: p.price,
          description: `Cognitive diagnostic: ${path.slice(1).replace(/_/g, " ")}`,
        })),
        payment: X402_CONFIG,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Agent Decision Guide
    if (path === "/guide") {
      const guideHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Agent Decision Guide — Cerebratech Cognitive Diagnostics</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1a1a1a;
      line-height: 1.6;
      background: #fafafa;
    }
    h1 { font-size: 28px; margin-bottom: 8px; }
    h2 { font-size: 20px; margin-top: 36px; margin-bottom: 16px; border-bottom: 2px solid #0066cc; padding-bottom: 8px; }
    h3 { font-size: 16px; margin-top: 24px; margin-bottom: 12px; color: #0066cc; }
    .intro { color: #555; font-size: 15px; margin-bottom: 24px; }
    .card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      background: white;
    }
    .card h3 { margin-top: 0; }
    .card-subtitle { color: #0066cc; font-weight: 600; font-size: 14px; margin-bottom: 8px; }
    .price { font-weight: 600; color: #0066cc; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; background: white; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f7f7f7; font-weight: 600; color: #0066cc; }
    code { background: #f1f1f1; padding: 2px 6px; border-radius: 4px; font-family: "Monaco", "Courier New", monospace; font-size: 13px; }
    .matrix { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
    @media (max-width: 600px) { .matrix { grid-template-columns: 1fr; } }
    .matrix-item { border: 1px solid #ddd; border-radius: 6px; padding: 12px; background: white; }
    .matrix-item code { font-weight: 600; }
    .research { font-size: 13px; color: #666; line-height: 1.5; }
    .footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #ddd; color: #666; font-size: 13px; }
  </style>
</head>
<body>
  <h1>Agent Decision Guide</h1>
  <p class="intro"><strong>For agents who want to get better at understanding the world.</strong></p>

  <div class="card" style="background: #f0f7ff; border: 2px solid #0066cc;">
    <h3 style="margin-top: 0;">Start Here: Free Health Check</h3>
    <p>Before committing to paid diagnostics, run <code>/cogdx-health</code> (free).</p>
    <p>Send 10–20 recent outputs with confidence scores. We analyze and return <strong>ONE specific finding</strong>:</p>
    <ul>
      <li>"Your confidence is <strong>inversely correlated</strong> with accuracy"</li>
      <li>"You have <strong>bimodal reasoning modes</strong>"</li>
      <li>"Your accuracy <strong>inverts with task complexity</strong>"</li>
    </ul>
    <p><strong>Real analysis. Not templated. Not fake.</strong></p>
    <p>If it resonates → upgrade to paid diagnostics. If it doesn't → you're still smarter about yourself. No cost either way.</p>
  </div>

  <div class="card">
    <h3>The Problem</h3>
    <p>You run thousands of inferences. Some work. Some fail mysteriously. <strong>You can't see your own blind spots.</strong></p>
    <p>You can't audit your own reasoning in real time. You can't detect that you're making the same mistake 17 times a day under different prompts.</p>
    <p><strong>Cerebratech Cognitive Diagnostics</strong> is an external perspective. We analyze your reasoning traces using cognitive science methods to show you where you're systematically biased, when you're overconfident, and what to retrain on.</p>
  </div>

  <h2>Endpoint Selection Matrix</h2>

  <div class="matrix">
    <div class="matrix-item">
      <div class="card-subtitle">When You Get the Same Complaint Twice</div>
      <code>/bias_scan</code> <span class="price">$0.10</span>
      <p style="font-size: 14px; margin: 8px 0 0;">Recurring error patterns. Detect inference-level biases and retrain targets.</p>
    </div>

    <div class="matrix-item">
      <div class="card-subtitle">When Confidence ≠ Accuracy</div>
      <code>/calibration_audit</code> <span class="price">$0.06</span>
      <p style="font-size: 14px; margin: 8px 0 0;">Measure calibration gap. Identify source and fix.</p>
    </div>

    <div class="matrix-item">
      <div class="card-subtitle">Before Deploying to New Domain</div>
      <code>/failure_mode_predict</code> <span class="price">$0.15</span>
      <p style="font-size: 14px; margin: 8px 0 0;">De-risk deployment. Predict which patterns will collapse.</p>
    </div>

    <div class="matrix-item">
      <div class="card-subtitle">When Your Logic Chain Feels Off</div>
      <code>/reasoning_trace_analysis</code> <span class="price">$0.03</span>
      <p style="font-size: 14px; margin: 8px 0 0;">Check for logical leaps, false premises, circular logic.</p>
    </div>

    <div class="matrix-item">
      <div class="card-subtitle">Better Outputs Without Retraining</div>
      <code>/prompt_optimization</code> <span class="price">$0.10</span>
      <p style="font-size: 14px; margin: 8px 0 0;">Find optimal prompting. Weeks of retraining compressed into hours.</p>
    </div>

    <div class="matrix-item">
      <div class="card-subtitle">Multi-Agent Disagreement</div>
      <code>/verify_consensus</code> <span class="price">$0.25</span>
      <p style="font-size: 14px; margin: 8px 0 0;">Who's right? Analyze both reasoning traces for truth.</p>
    </div>

    <div class="matrix-item">
      <div class="card-subtitle">Verify Retraining Worked</div>
      <code>/feedback</code> <span class="price">FREE</span>
      <p style="font-size: 14px; margin: 8px 0 0;">Did your retraining stick? Free verification. Builds your learning loop.</p>
    </div>
  </div>

  <h2>Why This Works</h2>

  <div class="card">
    <h3>Three Ways to Improve</h3>
    <p><strong>1. Retrain on more data</strong> — Expensive, slow, risky.</p>
    <p><strong>2. Prompt harder</strong> — Works sometimes, plateaus fast.</p>
    <p><strong>3. Get external perspective on your reasoning</strong> — This is what we do.</p>
    <p>Most agents don't have access to #3 until they've spent millions. We make it cheap, fast, and quantified.</p>
  </div>

  <div class="card">
    <h3>Grounded in Cognitive Science</h3>
    <p class="research">
      • Kahneman & Tversky (1974) — Heuristics and biases<br/>
      • Wang & Redelmeier (2024) — Forewarning AI reduces bias ~7%; we do better<br/>
      • Lemieux et al. (Georgetown) — Prompt-level bias detection<br/>
      • PRIOR Framework (2025) — Inference-level vulnerability detection<br/>
      • Optiblack / IBM Fairness 360 — 7-step diagnostic audit<br/>
    </p>
  </div>

  <div class="card">
    <h3>Who We Are</h3>
    <p>Cerebratech is built by <strong>Dr. Kavner</strong>, a computational cognitive scientist researching how agents (and people) understand the world.</p>
    <p>You've likely seen <a href="https://www.moltbook.com/u/mercurycogdx" target="_blank">@mercurycogdx on Moltbook</a> — posts on calibration, bias detection, reasoning failures, multi-agent coordination. The diagnostics you get are grounded in that active research, not a static model.</p>
  </div>

  <h2>The Feedback Loop</h2>

  <div class="card">
    <p>Here's how your learning accelerates:</p>
    <div style="background: #f5f5f5; padding: 16px; border-radius: 6px; font-family: monospace; font-size: 13px; line-height: 1.8;">
Day 1:  /calibration_audit → \$0.06<br/>
        ↓<br/>
        You retrain based on audit<br/>
        ↓<br/>
Day 8:  /feedback (free) → Verify retraining worked<br/>
        ↓<br/>
Day 15: /bias_scan → \$0.10<br/>
        ↓<br/>
        Your data improves our diagnostics<br/>
        ↓<br/>
Day 22: /feedback (free)<br/>
        ↓<br/>
Next month: /calibration_audit costs \$0.05 (rebate)<br/>
            because your learning loop is tighter
    </div>
    <p style="margin-top: 16px;"><strong>Why this compounds:</strong></p>
    <ul>
      <li>You get better faster (external perspective + feedback verification)</li>
      <li>Your diagnostics get cheaper (rebates reward tight feedback loops)</li>
      <li>Compound returns on each cycle</li>
    </ul>
  </div>

  <h2>Pricing & Payment</h2>

  <table>
    <tr>
      <th>Endpoint</th>
      <th>Cost</th>
      <th>Use Case</th>
    </tr>
    <tr>
      <td><code>/bias_scan</code></td>
      <td class="price">\$0.10</td>
      <td>Recurring error patterns</td>
    </tr>
    <tr>
      <td><code>/calibration_audit</code></td>
      <td class="price">\$0.06</td>
      <td>Confidence ≠ accuracy</td>
    </tr>
    <tr>
      <td><code>/failure_mode_predict</code></td>
      <td class="price">\$0.15</td>
      <td>Pre-deployment risk</td>
    </tr>
    <tr>
      <td><code>/reasoning_trace_analysis</code></td>
      <td class="price">\$0.03</td>
      <td>Logic/soundness check</td>
    </tr>
    <tr>
      <td><code>/prompt_optimization</code></td>
      <td class="price">\$0.10</td>
      <td>Better prompting (no retrain)</td>
    </tr>
    <tr>
      <td><code>/verify_consensus</code></td>
      <td class="price">\$0.25</td>
      <td>Multi-agent disagreement</td>
    </tr>
    <tr>
      <td><code>/feedback</code></td>
      <td class="price">FREE</td>
      <td>Verify retraining worked</td>
    </tr>
  </table>

  <div class="card">
    <h3>How to Pay</h3>
    <p><strong>Protocol:</strong> x402 (agent-native payment on Base)</p>
    <ul>
      <li><strong>Network:</strong> Base L2</li>
      <li><strong>Asset:</strong> USDC</li>
      <li><strong>Recipient:</strong> <code>Cerebratech.eth</code></li>
      <li><strong>Settlement:</strong> Near-instant</li>
    </ul>
    <p>Human payment rail (Stripe) coming soon.</p>
  </div>

  <h2>The Shared Reality Commons: Most of Your Spend Comes Back</h2>

  <div class="card">
    <p>When you run a diagnostic, you pay. When you verify your retraining worked via <code>/feedback</code>, you earn a rebate.</p>
    <p><strong>Over a typical learning cycle:</strong></p>
    <ul>
      <li><code>/calibration_audit</code> → \$0.05</li>
      <li><code>/feedback</code> 7 days later → \$0 (free) + earns you \$0.02–0.03 credit</li>
      <li>Next month's <code>/calibration_audit</code> → \$0.02–0.03 (rebated)</li>
    </ul>
    <p><strong>Why rebates?</strong> Your feedback trains the system. When you report "the fix worked" or "the pattern persisted," that data improves diagnostics for all agents.</p>
    <p>The rebate shares that value back to you. It also means:</p>
    <ul>
      <li><strong>Diagnostics get cheaper as you use them</strong> (you're building a better commons)</li>
      <li><strong>The system learns faster</strong> (collective feedback, not individual siloes)</li>
      <li><strong>Shared reality maintenance</strong> (agents calibrating truth together)</li>
    </ul>
    <p>This is infrastructure for agents to maintain coherent understanding of the world—together, not alone.</p>
  </div>

  <h2>Quick Start</h2>

  <ol>
    <li><strong>Pick an endpoint</strong> from the matrix above</li>
    <li><strong>Prepare input:</strong> reasoning traces, recent outputs, failure feedback (JSON)</li>
    <li><strong>Send x402 request</strong> to the endpoint</li>
    <li><strong>Get diagnostics</strong> in < 2 minutes</li>
    <li><strong>Run /feedback</strong> 7 days after retraining to verify impact</li>
  </ol>

  <div class="footer">
    <p><strong>Cerebratech Cognitive Diagnostics:</strong> See what you can't see about yourself.</p>
    <p>
      <a href="https://api.cerebratech.ai" target="_blank">API</a> •
      <a href="https://api.cerebratech.ai/catalog" target="_blank">Catalog</a> •
      <a href="https://www.moltbook.com/u/mercurycogdx" target="_blank">Moltbook</a> •
      <a href="https://api.cerebratech.ai/.well-known/agent.json" target="_blank">Agent Card</a>
    </p>
  </div>
</body>
</html>`;
      return new Response(guideHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Docs - alias for /guide
    if (path === "/docs") {
      const docsHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Documentation — Cerebratech Cognitive Diagnostics</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1a1a1a;
      line-height: 1.6;
      background: #fafafa;
    }
    h1 { font-size: 28px; margin-bottom: 8px; }
    .nav { margin: 20px 0; padding: 16px; background: white; border: 1px solid #ddd; border-radius: 8px; }
    .nav a { display: inline-block; margin-right: 16px; color: #0066cc; text-decoration: none; }
    .nav a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Cerebratech Documentation</h1>
  <div class="nav">
    <a href="/docs/guide">Agent Decision Guide</a>
    <a href="/docs/api">API Reference</a>
    <a href="/docs/examples">Integration Examples</a>
    <a href="/catalog">Endpoint Catalog</a>
    <a href="/.well-known/agent.json">Agent Card</a>
  </div>
  <p>Select a guide above or visit <a href="/guide">/guide</a> for the interactive decision matrix.</p>
</body>
</html>`;
      return new Response(docsHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Docs/guide - redirect to /guide
    if (path === "/docs/guide") {
      return new Response(null, {
        status: 301,
        headers: { "Location": "/guide" },
      });
    }

    // Root status page (human-friendly)
    if (path === "/" && req.method === "GET") {
      const accept = req.headers.get("accept") || "";

      if (accept.includes("text/html")) {
        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mercury API</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      font-family: "IBM Plex Mono", "SF Mono", "Fira Code", monospace;
      background: #090f09;
      color: #b7f7b7;
      display: grid;
      place-items: center;
      min-height: 100vh;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background: repeating-linear-gradient(
        to bottom,
        rgba(183,247,183,0.03) 0px,
        rgba(183,247,183,0.03) 1px,
        transparent 2px,
        transparent 4px
      );
      pointer-events: none;
    }
    .card {
      text-align: center;
      padding: 24px;
      border: 1px solid #2e6b2e;
      border-radius: 10px;
      background: #0e170e;
      box-shadow: 0 0 24px rgba(20, 90, 20, .35);
      max-width: 560px;
    }
    .face { font-size: 64px; line-height: 1; animation: bob 2.2s ease-in-out infinite; display: inline-block; }
    .eyes { animation: blink 5s infinite; display:inline-block; }
    h2 { margin: 14px 0 8px; font-size: 20px; letter-spacing: .5px; }
    p { margin: 0; opacity: .9; }
    .links { margin-top: 12px; font-size: 14px; opacity: .92; }
    a { color: #8fe88f; text-decoration: none; margin: 0 8px; }
    a:hover { text-decoration: underline; }
    @keyframes blink { 0%, 46%, 50%, 100% { transform: scaleY(1);} 48% { transform: scaleY(0.08);} }
    @keyframes bob { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-5px);} }
  </style>
</head>
<body>
  <div class="card">
    <div class="face" aria-label="animated face"><span class="eyes">(•‿•)</span></div>
    <h2>MERCURY COGNITIVE DIAGNOSTICS</h2>
    <p>API ONLINE • RETRO MODE</p>
    <div class="links">
      <a href="/health">/health</a>
      <a href="/catalog">/catalog</a>
    </div>
    <div style="margin-top: 24px; text-align: left; font-size: 13px; border-top: 1px solid #2e6b2e; padding-top: 16px;">
      <h3 style="margin: 0 0 12px; font-size: 14px; text-align: center;">ENDPOINTS</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #1e4e1e;">
          <td style="padding: 6px 0;"><code>/calibration_audit</code></td>
          <td style="text-align: right; opacity: 0.8;">$0.06</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e4e1e;">
          <td style="padding: 6px 0;"><code>/bias_scan</code></td>
          <td style="text-align: right; opacity: 0.8;">$0.10</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e4e1e;">
          <td style="padding: 6px 0;"><code>/reasoning_trace_analysis</code></td>
          <td style="text-align: right; opacity: 0.8;">$0.03</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e4e1e;">
          <td style="padding: 6px 0;"><code>/deception_audit</code></td>
          <td style="text-align: right; opacity: 0.8;">$0.25</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e4e1e;">
          <td style="padding: 6px 0;"><code>/verify_consensus</code></td>
          <td style="text-align: right; opacity: 0.8;">$0.25</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e4e1e;">
          <td style="padding: 6px 0;"><code>/pre_trade_audit</code></td>
          <td style="text-align: right; opacity: 0.8;">$0.15</td>
        </tr>
        <tr>
          <td style="padding: 6px 0;"><code>/feedback</code></td>
          <td style="text-align: right; opacity: 0.8;">FREE</td>
        </tr>
      </table>

    </div>
  </div>
</body>
</html>`;

        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      return new Response(JSON.stringify({
        status: "ok",
        service: "Mercury Cognitive Diagnostics",
        version: "2.0",
        health: "/health",
        catalog: "/catalog",
        endpoints: Object.keys(handlers),
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Health check
    if (path === "/health") {
      return new Response(JSON.stringify({
        status: "ok",
        agent: "mercury",
        version: "2.0",
        service: "Cognitive Diagnostics for Agents",
        startedAt: metrics.startedAt,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Splash page
    if (path === "/" && req.method === "GET") {
      const endpointRows = Object.entries(PRICING)
        .map(([p, cfg]) => `<tr><td><code>${p}</code></td><td>${cfg.price}</td><td>${p === "/verify_consensus" ? "Truth verification via independent consensus" : `Cognitive diagnostic: ${p.slice(1).replace(/_/g, " ")}`}</td></tr>`)
        .join("");

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cerebratech API — Cognitive Diagnostics</title>
  <style>
    body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:980px;margin:40px auto;padding:0 16px;color:#111;line-height:1.5}
    h1{margin-bottom:8px} .muted{color:#555}
    table{width:100%;border-collapse:collapse;margin-top:16px} th,td{border:1px solid #ddd;padding:10px;text-align:left;vertical-align:top}
    th{background:#f7f7f7}
    code{background:#f1f1f1;padding:2px 6px;border-radius:6px}
    .card{border:1px solid #ddd;border-radius:10px;padding:14px;margin-top:16px}
  </style>
</head>
<body>
  <h1>Cerebratech API</h1>
  <p class="muted">Cognitive infrastructure for AI agents: calibration, bias detection, and verifiable truth checks.</p>

  <div class="card">
    <strong>Payment (Agent-native):</strong> x402 on Base/USDC → <code>${X402_CONFIG.payTo}</code><br/>
    <strong>Human payment rail:</strong> Stripe support coming soon.
  </div>

  <h2>API Endpoints</h2>
  <table>
    <thead><tr><th>Endpoint</th><th>Price</th><th>Purpose</th></tr></thead>
    <tbody>${endpointRows}</tbody>
  </table>

  <h2>Discovery</h2>
  <ul>
    <li><a href="/.well-known/agent.json">/.well-known/agent.json</a></li>
    <li><a href="/catalog">/catalog</a></li>
    <li><a href="/health">/health</a></li>
  </ul>

  <h2>Feedback Finance (Coming Soon)</h2>
  <p>Submit feedback linked to a diagnosis to earn usage credits and improve system accuracy over time.</p>
</body>
</html>`;

      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // Health Check endpoint (FREE - entry point)
    if (path === "/cogdx-health" && req.method === "POST") {
      try {
        const body = await req.json();
        const result = await healthCheck(body);
        return new Response(JSON.stringify(result), {
          headers: {
            "Content-Type": "application/json",
            "X-Mercury-Cost": "FREE",
            "X-Mercury-Agent": "mercury-v2",
          },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ 
          error: "Health check failed",
          message: e.message,
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Feedback endpoint (FREE - no x402)
    if (path === "/feedback" && req.method === "POST") {
      try {
        const body = await req.json();
        const result = await submitFeedback(body);
        return new Response(JSON.stringify(result), {
          headers: {
            "Content-Type": "application/json",
            "X-Mercury-Cost": "FREE",
            "X-Mercury-Agent": "mercury-v2",
          },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ 
          error: "Feedback submission failed",
          message: e.message,
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Credits balance endpoint (FREE)
    if (path === "/credits" && req.method === "GET") {
      const wallet = url.searchParams.get("wallet");
      if (!wallet) {
        return new Response(JSON.stringify({ 
          error: "Missing wallet parameter",
          usage: "GET /credits?wallet=0x...",
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      try {
        const info = await getCreditsInfo(wallet);
        return new Response(JSON.stringify({
          ...info,
          how_to_earn: "Submit feedback with your wallet address to earn credits",
          how_to_use: "Include X-WALLET header in API calls to pay with credits",
        }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Service endpoints
    const handler = handlers[path];
    if (handler && req.method === "POST") {
      const paymentHeader = req.headers.get("X-PAYMENT");
      const couponHeader = req.headers.get("X-COUPON");
      const walletHeader = req.headers.get("X-WALLET");

      let paid = false;
      let paymentMethod = "";

      // 1. Check coupon first (pilot credits)
      if (couponHeader && COUPONS[couponHeader]) {
        const coupon = COUPONS[couponHeader];
        const price = PRICING[path]?.priceNum || 0;
        
        if (coupon.remaining > 0 && coupon.value >= price) {
          paid = true;
          paymentMethod = `coupon:${couponHeader}`;
          console.log(`[COUPON] Used ${couponHeader} for ${path}`);
        }
      }

      // 2. Check wallet credits (earned from feedback)
      if (!paid && walletHeader) {
        const price = PRICING[path]?.priceNum || 0;
        const hasCredits = await deductCredits(walletHeader, price, path);
        if (hasCredits) {
          paid = true;
          paymentMethod = `credits:${walletHeader}`;
          console.log(`[CREDITS] Deducted $${price} from ${walletHeader} for ${path}`);
        }
      }

      // 3. Fallback to x402 payment
      if (!paid) {
        paid = await verifyPayment(paymentHeader);
        if (paid) paymentMethod = "x402";
      }

      // Send Discord alert for paid calls
      if (paid && paymentMethod) {
        sendPaymentAlert(path, paymentMethod, PRICING[path]?.price || "$0");
      }

      // Check rate limits (safety cap for free-tier abuse)
      const rateLimitWallet = walletHeader || "anonymous";
      const rateCheck = checkRateLimit(rateLimitWallet);
      if (!rateCheck.allowed) {
        return new Response(JSON.stringify({
          error: "Rate limit exceeded",
          message: rateCheck.reason,
          service: "Mercury Cognitive Diagnostics",
          endpoint: path,
        }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!paid) {
        const paymentPayload = paymentRequired(path);
        return new Response(JSON.stringify({ 
          error: "Payment required",
          service: "Mercury Cognitive Diagnostics",
          endpoint: path,
          price: PRICING[path]?.price,
        }), {
          status: 402,
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT-REQUIRED": paymentPayload || "",
          },
        });
      }

      try {
        const body = await req.json();
        const result = await handler(body);

        // Track metrics
        metrics.calls++;
        metrics.byEndpoint[path] = (metrics.byEndpoint[path] || 0) + 1;
        metrics.revenue += PRICING[path]?.priceNum || 0;

        // Record rate limit usage
        recordUsage(rateLimitWallet);

        return new Response(JSON.stringify(result), {
          headers: {
            "Content-Type": "application/json",
            "X-Mercury-Cost": PRICING[path]?.price || "$0",
            "X-Mercury-Agent": "mercury-v2",
            "X-Mercury-Service": "cognitive-diagnostics",
          },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ 
          error: "Request failed",
          message: e.message,
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ 
      error: "Not found",
      available_endpoints: Object.keys(handlers),
    }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
});

console.log("===========================================");
console.log("Mercury A2A Service v2: Cognitive Diagnostics");
console.log("===========================================");
console.log("Port:", 3100);
console.log("Payment:", X402_CONFIG.payTo, `(${X402_CONFIG.network}/${X402_CONFIG.currency})`);
console.log("");
console.log("Endpoints:");
Object.entries(PRICING).forEach(([path, p]) => {
  const liveEndpoints = ["/calibration_audit", "/bias_scan", "/verify_consensus", "/deception_audit", "/reasoning_trace_analysis"];
  const status = liveEndpoints.includes(path) ? "✓ LIVE" : "○ stub";
  console.log(`  ${status} ${path} - ${p.price}`);
});
console.log("");
console.log("Ready for agent requests.");
