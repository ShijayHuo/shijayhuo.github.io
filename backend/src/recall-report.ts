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

export function createRecallReport(input: {
  model: string;
  dimensions: number;
  results: RecallCaseResult[];
}): RecallReport {
  return {
    recallAccepted: false,
    thresholdValidated: MIN_SCORE_CALIBRATED,
    minScore: DEFAULT_MIN_SCORE,
    reason: "阈值未用真实博客的召回和无依据负例校准。四句探针里无关余弦 0.308，已经高于 0.25。本次只记录分数，不宣布召回通过，也不调低阈值。",
    probe: EMBEDDING_SCORE_PROBE,
    model: input.model,
    dimensions: input.dimensions,
    results: input.results,
  };
}
