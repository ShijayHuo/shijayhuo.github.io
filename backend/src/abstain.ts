/** 全库冒烟观察。不是调阈值的拟合集，也不能把间隙中点写成有效门限。 */
export const RECORDED_SMOKE = {
  documents: 102,
  chunks: 669,
  buildSeconds: 48.8,
  jsonBytes: 13869263,
  gzipBytes: 3449048,
  positiveCount: 6,
  positiveTop1: 6,
  positiveMin: 0.5836,
  positiveMax: 0.7509,
  negatives: [
    { id: "unknown-tax", url: "/about/", score: 0.4486 },
    { id: "unpublished-career", url: "/about/", score: 0.4507 },
  ],
} as const;

export interface SmokeSeparation {
  positiveMin: number;
  positiveMax: number;
  negativeMax: number;
  gap: number;
  defaultMinScoreAdmitsNegatives: true;
  recallAccepted: false;
  thresholdValidated: false;
  validatedThreshold: null;
}

export function describeSmokeSeparation(): SmokeSeparation {
  const negativeMax = Math.max(...RECORDED_SMOKE.negatives.map((item) => item.score));
  return {
    positiveMin: RECORDED_SMOKE.positiveMin,
    positiveMax: RECORDED_SMOKE.positiveMax,
    negativeMax,
    gap: RECORDED_SMOKE.positiveMin - negativeMax,
    defaultMinScoreAdmitsNegatives: true,
    recallAccepted: false,
    thresholdValidated: false,
    validatedThreshold: null,
  };
}

/** 分数不高于已记录负例最高分时，0.25 这种门限会把无依据片段送进生成。 */
export function admitsRecordedNegatives(minScore: number): boolean {
  return minScore <= describeSmokeSeparation().negativeMax;
}
