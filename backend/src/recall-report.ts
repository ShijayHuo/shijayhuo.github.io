import { describeSmokeSeparation } from "./abstain.ts";
import { DEFAULT_MIN_SCORE, EMBEDDING_SCORE_PROBE, MIN_SCORE_CALIBRATED } from "./limits.ts";

export interface RecallCaseResult {
  id: string;
  question: string;
  top: Array<{ url: string; score: number; title: string }>;
  expectedUrls: string[];
  forbiddenUrls: string[];
  expectedRank: number | null;
  forbiddenHit: boolean;
}

export interface RecallReport {
  recallAccepted: false;
  thresholdValidated: boolean;
  minScore: number;
  reason: string;
  probe: typeof EMBEDDING_SCORE_PROBE;
  model: string;
  dimensions: number;
  results: RecallCaseResult[];
}

function recallReason(): string {
  const smoke = describeSmokeSeparation();
  return [
    "阈值未校准。四句探针里无关余弦 0.308，已经高于 0.25。",
    `全库冒烟正例 Top1 分数 ${smoke.positiveMin} 到 ${smoke.positiveMax}，`,
    `无依据负例最高 ${smoke.negativeMax}，落在 /about/。`,
    "0.25 会把这些负例送进生成。间隙不是已验证阈值，本次不宣布召回通过，也不改门限。",
  ].join("");
}

export function createRecallReport(input: {
  model: string;
  dimensions: number;
  results: RecallCaseResult[];
}): RecallReport {
  return {
    recallAccepted: false,
    thresholdValidated: MIN_SCORE_CALIBRATED,
    minScore: DEFAULT_MIN_SCORE,
    reason: recallReason(),
    probe: EMBEDDING_SCORE_PROBE,
    model: input.model,
    dimensions: input.dimensions,
    results: input.results,
  };
}
