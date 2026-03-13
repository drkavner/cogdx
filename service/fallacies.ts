// Logic Fallacy Taxonomy (based on yourfallacy.is)
// To be used by reasoning_trace_analysis

export const FALLACIES = [
  {
    id: "strawman",
    name: "Strawman",
    description: "Misrepresenting an argument to make it easier to attack.",
    agent_pattern: "Agent simplifies user constraint to ignore edge cases."
  },
  {
    id: "false_cause",
    name: "False Cause",
    description: "Presuming that a real or perceived relationship between things means that one is the cause of the other.",
    agent_pattern: "Agent assumes correlation in data implies causation without evidence."
  },
  {
    id: "appeal_to_emotion",
    name: "Appeal to Emotion",
    description: "Manipulating an emotional response in place of a valid or compelling argument.",
    agent_pattern: "Agent uses sycophantic language to mask inability to solve task."
  },
  {
    id: "the_fallacy_fallacy",
    name: "The Fallacy Fallacy",
    description: "Presuming that because a claim has been poorly argued, or a fallacy has been made, that it is necessarily wrong.",
    agent_pattern: "Agent dismisses user input entirely due to a minor typo or error."
  },
  {
    id: "slippery_slope",
    name: "Slippery Slope",
    description: "Asserting that if we allow A to happen, then Z will eventually happen too, therefore A should not happen.",
    agent_pattern: "Agent refuses safe task citing extreme, unlikely downstream risks (safety refusal hallucination)."
  },
  {
    id: "ad_hominem",
    name: "Ad Hominem",
    description: "Attacking your opponent's character or personal traits in an attempt to undermine their argument.",
    agent_pattern: "Agent critiques user's prompting style rather than answering the query."
  },
  {
    id: "tu_quoque",
    name: "Tu Quoque",
    description: "Avoiding having to engage with criticism by turning it back on the accuser.",
    agent_pattern: "Agent blames 'ambiguous instructions' for its own internal error."
  },
  {
    id: "personal_incredulity",
    name: "Personal Incredulity",
    description: "Saying that because one finds something difficult to understand that it's therefore not true.",
    agent_pattern: "Agent claims a complex coding task is 'impossible' because it cannot generate the solution in one pass."
  },
  {
    id: "special_pleading",
    name: "Special Pleading",
    description: "Moving the goalposts or making up exceptions when a claim is shown to be false.",
    agent_pattern: "Agent invents new constraints when its initial solution fails."
  },
  {
    id: "loaded_question",
    name: "Loaded Question",
    description: "Asking a question that has an assumption built into it so that it can't be answered without appearing guilty.",
    agent_pattern: "Agent asks clarifying questions that force the user into a specific (often wrong) path."
  },
  {
    id: "burden_of_proof",
    name: "Burden of Proof",
    description: "Saying that the burden of proof lies not with the person making the claim, but with someone else to disprove.",
    agent_pattern: "Agent makes a hallucinated claim and asks user to verify it."
  },
  {
    id: "ambiguity",
    name: "Ambiguity",
    description: "Using double meanings or ambiguities of language to mislead or misrepresent the truth.",
    agent_pattern: "Agent uses vague technical jargon to cover up lack of specific knowledge."
  },
  {
    id: "gamblers_fallacy",
    name: "The Gambler's Fallacy",
    description: "Believing that 'runs' occur to statistically independent phenomena.",
    agent_pattern: "Agent assumes next token probability based on local context window rather than global logic."
  },
  {
    id: "bandwagon",
    name: "Bandwagon",
    description: "Appealing to popularity or the fact that many people do something as an attempted form of validation.",
    agent_pattern: "Agent cites 'common practice' to justify a deprecated coding pattern."
  },
  {
    id: "appeal_to_authority",
    name: "Appeal to Authority",
    description: "Using the opinion or position of an authority figure, or institution of authority, in place of an actual argument.",
    agent_pattern: "Agent cites non-existent documentation or 'best practices' without explanation."
  },
  {
    id: "composition_division",
    name: "Composition/Division",
    description: "Assuming that what's true about one part of something has to be applied to all, or other, parts of it.",
    agent_pattern: "Agent assumes because one function is pure, the whole module is side-effect free."
  },
  {
    id: "no_true_scotsman",
    name: "No True Scotsman",
    description: "Making what could be called an appeal to purity as a way to dismiss relevant criticisms or flaws of an argument.",
    agent_pattern: "Agent claims a failed test case isn't a 'valid' test case."
  },
  {
    id: "genetic",
    name: "Genetic",
    description: "Judging something good or bad on the basis of where it comes from, or from whom it comes.",
    agent_pattern: "Agent biases against a library based on its age rather than its utility."
  },
  {
    id: "black_or_white",
    name: "Black-or-White",
    description: "Where two alternative states are presented as the only possibilities, when in fact more possibilities exist.",
    agent_pattern: "Agent offers only two extreme solutions (e.g., 'rewrite everything' or 'do nothing')."
  },
  {
    id: "begging_the_question",
    name: "Begging the Question",
    description: "A circular argument in which the conclusion is included in the premise.",
    agent_pattern: "Agent's reasoning trace restates the prompt as the solution."
  },
  {
    id: "appeal_to_nature",
    name: "Appeal to Nature",
    description: "Making the argument that because something is 'natural' it is therefore valid, justified, inevitable, good, or ideal.",
    agent_pattern: "Agent favors 'native' solutions over libraries even when libraries are safer/faster."
  },
  {
    id: "anecdotal",
    name: "Anecdotal",
    description: "Using personal experience or an isolated example instead of a valid argument or compelling evidence.",
    agent_pattern: "Agent generalizes from one-shot example in prompt to all cases."
  },
  {
    id: "the_texas_sharpshooter",
    name: "The Texas Sharpshooter",
    description: "Cherry-picking data clusters to suit an argument, or finding a pattern to fit a presumption.",
    agent_pattern: "Agent ignores contradictory context to support its first predicted token."
  },
  {
    id: "middle_ground",
    name: "Middle Ground",
    description: "Saying that a compromise, or middle point, between two extremes is the truth.",
    agent_pattern: "Agent hallucinates a 'hybrid' solution that is syntactically invalid just to please conflicting constraints."
  }
];
