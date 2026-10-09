import type { ConfirmedStudyOutcome } from '../types';

export interface FrequencyRow<T> {
  value: T;
  count: number;
}

export function frequencyTable<T extends string | number>(values: Array<T | null | undefined>): FrequencyRow<T>[] {
  const counts = new Map<T, number>();
  values.forEach((value) => {
    if (value == null || (typeof value === 'number' && !Number.isFinite(value))) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => typeof left.value === 'number' && typeof right.value === 'number'
      ? left.value - right.value
      : String(left.value).localeCompare(String(right.value), 'vi'));
}

export interface StrictWeeklyCompletionPoint {
  weekStart: string;
  validDone: number;
  plannedCurrent: number;
  plannedOriginal: number;
  pctCurrent: number | null;
  pctOriginal: number | null;
}

export function calculateStrictWeeklyCompletion(input: {
  goalId: string | undefined;
  weeklySummaries: { weekStart: string; plannedCurrent: number; plannedOriginal: number }[];
  sessionLogs: { goalId: string; sessionDate: string; status: 'done' | 'partial' | 'missed' }[];
  planVersions: { goalId: string; effectiveFrom: string }[];
  weeklyStatuses: { weekStart: string; status: string }[];
  restPeriods: { dateFrom: string; dateTo: string }[];
}): StrictWeeklyCompletionPoint[] {
  if (!input.goalId) return [];
  const addUtcDays = (isoDate: string, days: number) => {
    const date = new Date(`${isoDate}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  return input.weeklySummaries.flatMap((summary) => {
    const weekEnd = addUtcDays(summary.weekStart, 6);
    const hasEffectivePlan = input.planVersions.some((plan) => (
      plan.goalId === input.goalId && plan.effectiveFrom <= weekEnd
    ));
    const isResting = input.weeklyStatuses.some((status) => (
      status.weekStart === summary.weekStart && status.status === 'resting'
    ));
    const overlapsApprovedRest = input.restPeriods.some((rest) => (
      rest.dateFrom <= weekEnd && rest.dateTo >= summary.weekStart
    ));
    if (summary.plannedCurrent <= 0 || !hasEffectivePlan || isResting || overlapsApprovedRest) return [];

    const validDone = input.sessionLogs.filter((log) => (
      log.goalId === input.goalId
      && log.sessionDate >= summary.weekStart
      && log.sessionDate <= weekEnd
      && log.status === 'done'
    )).length;
    return [{
      weekStart: summary.weekStart,
      validDone,
      plannedCurrent: summary.plannedCurrent,
      plannedOriginal: summary.plannedOriginal,
      pctCurrent: (validDone / summary.plannedCurrent) * 100,
      pctOriginal: summary.plannedOriginal > 0 ? (validDone / summary.plannedOriginal) * 100 : null
    }];
  }).sort((left, right) => left.weekStart.localeCompare(right.weekStart));
}

export function binSessionCountFrequencies(rows: FrequencyRow<number>[]): FrequencyRow<string>[] {
  const bins: { value: string; includes: (value: number) => boolean }[] = [
    { value: '0', includes: (value) => value === 0 },
    { value: '1–2', includes: (value) => value >= 1 && value <= 2 },
    { value: '3–4', includes: (value) => value >= 3 && value <= 4 },
    { value: '5–8', includes: (value) => value >= 5 && value <= 8 },
    { value: '9+', includes: (value) => value >= 9 }
  ];
  return bins.map((bin) => ({
    value: bin.value,
    count: rows.reduce((total, row) => total + (bin.includes(row.value) ? row.count : 0), 0)
  }));
}

export interface NumericSummary {
  n: number;
  mean: number | null;
  standardDeviation: number | null;
  median: number | null;
  q1: number | null;
  q3: number | null;
  iqr: number | null;
  minimum: number | null;
  maximum: number | null;
  modes: number[];
}

export interface ProportionComparison {
  difference: number;
  ciLower: number;
  ciUpper: number;
  pValue: number;
  test: 'fisher_exact' | 'chi_square';
}

export function findModes<T>(rows: FrequencyRow<T>[]): T[] {
  const validRows = rows.filter((row) => row.count > 0);
  if (validRows.length === 0) return [];
  const maximum = Math.max(...validRows.map((row) => row.count));
  if (validRows.length > 1 && validRows.every((row) => row.count === maximum)) return [];
  return validRows.filter((row) => row.count === maximum).map((row) => row.value);
}

export function summarizeNumericFrequencies(rows: FrequencyRow<number>[]): NumericSummary {
  const validRows = rows.filter((row) => Number.isFinite(row.value) && row.count > 0).sort((a, b) => a.value - b.value);
  const n = validRows.reduce((total, row) => total + row.count, 0);
  if (!n) {
    return {
      n: 0,
      mean: null,
      standardDeviation: null,
      median: null,
      q1: null,
      q3: null,
      iqr: null,
      minimum: null,
      maximum: null,
      modes: []
    };
  }

  const weightedSum = validRows.reduce((total, row) => total + row.value * row.count, 0);
  const valueAt = (index: number) => {
    let preceding = 0;
    for (const row of validRows) {
      if (index < preceding + row.count) return row.value;
      preceding += row.count;
    }
    return validRows[validRows.length - 1].value;
  };
  const quantileAt = (probability: number) => {
    const rank = (n - 1) * probability;
    const lowerIndex = Math.floor(rank);
    const upperIndex = Math.ceil(rank);
    const fraction = rank - lowerIndex;
    return valueAt(lowerIndex) + (valueAt(upperIndex) - valueAt(lowerIndex)) * fraction;
  };
  const mean = weightedSum / n;
  const sumSquaredDeviations = validRows.reduce(
    (total, row) => total + row.count * ((row.value - mean) ** 2),
    0
  );
  const q1 = quantileAt(0.25);
  const median = quantileAt(0.5);
  const q3 = quantileAt(0.75);

  return {
    n,
    mean,
    standardDeviation: n > 1 ? Math.sqrt(sumSquaredDeviations / (n - 1)) : null,
    median,
    q1,
    q3,
    iqr: q3 - q1,
    minimum: validRows[0].value,
    maximum: validRows[validRows.length - 1].value,
    modes: findModes(validRows)
  };
}

export interface TwoProportionSampleSize {
  controlRate: number;
  interventionRate: number;
  uninflatedPerArm: number;
  perArmAfterLoss: number;
  totalAfterLoss: number;
}

export function calculateTwoProportionSampleSize(input: {
  controlDropoutPct: number;
  minimumReductionPct: number;
  alpha: 0.01 | 0.05;
  power: 0.8 | 0.9;
  expectedLossPct: number;
}): TwoProportionSampleSize | null {
  const { controlDropoutPct, minimumReductionPct, alpha, power, expectedLossPct } = input;
  if (
    !Number.isFinite(controlDropoutPct)
    || !Number.isFinite(minimumReductionPct)
    || !Number.isFinite(expectedLossPct)
    || controlDropoutPct <= 0 || controlDropoutPct >= 100
    || minimumReductionPct <= 0 || minimumReductionPct >= controlDropoutPct
    || expectedLossPct < 0 || expectedLossPct >= 100
  ) return null;

  const criticalAlpha = alpha === 0.01 ? 2.575829 : 1.959964;
  const criticalPower = power === 0.9 ? 1.281552 : 0.841621;
  const controlRate = controlDropoutPct / 100;
  const interventionRate = (controlDropoutPct - minimumReductionPct) / 100;
  const averageRate = (controlRate + interventionRate) / 2;
  const numerator = criticalAlpha * Math.sqrt(2 * averageRate * (1 - averageRate))
    + criticalPower * Math.sqrt(
      controlRate * (1 - controlRate)
      + interventionRate * (1 - interventionRate)
    );
  const uninflatedPerArm = Math.ceil((numerator ** 2) / ((controlRate - interventionRate) ** 2));
  const perArmAfterLoss = Math.ceil(uninflatedPerArm / (1 - expectedLossPct / 100));

  return {
    controlRate,
    interventionRate,
    uninflatedPerArm,
    perArmAfterLoss,
    totalAfterLoss: perArmAfterLoss * 2
  };
}

export function wilsonScoreInterval(successes: number, total: number, z = 1.96): [number, number] | null {
  if (total <= 0 || successes < 0 || successes > total) return null;
  const p = successes / total;
  const zSquared = z * z;
  const denominator = 1 + zSquared / total;
  const center = (p + zSquared / (2 * total)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p) + zSquared / (4 * total)) / total)) / denominator;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

export function newcombeRiskDifferenceInterval(
  successesA: number,
  totalA: number,
  successesB: number,
  totalB: number
): { difference: number; lower: number; upper: number } | null {
  if (totalA <= 0 || totalB <= 0) return null;
  const intervalA = wilsonScoreInterval(successesA, totalA);
  const intervalB = wilsonScoreInterval(successesB, totalB);
  if (!intervalA || !intervalB) return null;

  const proportionA = successesA / totalA;
  const proportionB = successesB / totalB;
  const difference = proportionA - proportionB;
  const lower = difference - Math.sqrt(
    (proportionA - intervalA[0]) ** 2 + (intervalB[1] - proportionB) ** 2
  );
  const upper = difference + Math.sqrt(
    (intervalA[1] - proportionA) ** 2 + (proportionB - intervalB[0]) ** 2
  );
  return { difference, lower: Math.max(-1, lower), upper: Math.min(1, upper) };
}

function buildLogFactorials(maximum: number): number[] {
  const values = new Array(maximum + 1).fill(0);
  for (let value = 2; value <= maximum; value += 1) {
    values[value] = values[value - 1] + Math.log(value);
  }
  return values;
}

function logCombination(n: number, k: number, logFactorials: number[]): number {
  if (k < 0 || k > n) return Number.NEGATIVE_INFINITY;
  return logFactorials[n] - logFactorials[k] - logFactorials[n - k];
}

export function fisherExactTwoSided(successesA: number, totalA: number, successesB: number, totalB: number): number | null {
  if (
    totalA <= 0 || totalB <= 0 || successesA < 0 || successesA > totalA
    || successesB < 0 || successesB > totalB
  ) return null;

  const total = totalA + totalB;
  const successes = successesA + successesB;
  const minimumA = Math.max(0, successes - totalB);
  const maximumA = Math.min(totalA, successes);
  const logFactorials = buildLogFactorials(total);
  const denominator = logCombination(total, successes, logFactorials);
  const observedProbability = Math.exp(
    logCombination(totalA, successesA, logFactorials)
    + logCombination(totalB, successesB, logFactorials)
    - denominator
  );
  let pValue = 0;

  for (let valueA = minimumA; valueA <= maximumA; valueA += 1) {
    const probability = Math.exp(
      logCombination(totalA, valueA, logFactorials)
      + logCombination(totalB, successes - valueA, logFactorials)
      - denominator
    );
    if (probability <= observedProbability + 1e-12) pValue += probability;
  }

  return Math.min(1, pValue);
}

function complementaryErrorFunction(value: number): number {
  const absolute = Math.abs(value);
  const t = 1 / (1 + 0.5 * absolute);
  const approximation = t * Math.exp(
    -absolute * absolute - 1.26551223
    + t * (1.00002368
      + t * (0.37409196
        + t * (0.09678418
          + t * (-0.18628806
            + t * (0.27886807
              + t * (-1.13520398
                + t * (1.48851587
                  + t * (-0.82215223 + t * 0.17087277))))))))
  );
  return value >= 0 ? approximation : 2 - approximation;
}

export function chiSquareOneDegreePValue(statistic: number): number {
  if (statistic <= 0) return 1;
  return Math.max(0, Math.min(1, complementaryErrorFunction(Math.sqrt(statistic / 2))));
}

export function compareBinaryProportions(
  successesA: number,
  totalA: number,
  successesB: number,
  totalB: number
): ProportionComparison | null {
  const interval = newcombeRiskDifferenceInterval(successesA, totalA, successesB, totalB);
  if (!interval) return null;

  const totalSuccesses = successesA + successesB;
  const totalFailures = totalA + totalB - totalSuccesses;
  const expected = [
    totalA * totalSuccesses / (totalA + totalB),
    totalA * totalFailures / (totalA + totalB),
    totalB * totalSuccesses / (totalA + totalB),
    totalB * totalFailures / (totalA + totalB)
  ];
  const useFisher = expected.some((value) => value < 5);
  const pooledProportion = totalSuccesses / (totalA + totalB);
  const pooledVariance = pooledProportion * (1 - pooledProportion) * (1 / totalA + 1 / totalB);
  const pValue = useFisher
    ? fisherExactTwoSided(successesA, totalA, successesB, totalB)
    : pooledVariance > 0
      ? chiSquareOneDegreePValue((interval.difference ** 2) / pooledVariance)
      : 1;

  if (pValue == null || !Number.isFinite(pValue)) return null;
  return {
    difference: interval.difference,
    ciLower: interval.lower,
    ciUpper: interval.upper,
    pValue,
    test: useFisher ? 'fisher_exact' : 'chi_square'
  };
}

export interface DropoutArmSummary {
  arm: 'control' | 'intervention';
  randomized: number;
  confirmedDropouts: number;
  knownOutcomes: number;
  unresolved: number;
  withdrawn: number;
  consentMissing: number;
  followUpNotDue: number;
  missingFinalOutcome: number;
  assignmentDateUnknown: number;
  confirmedRatePct: number | null;
  confirmedRateCI95: [number, number] | null;
  sensitivityLowerPct: number | null;
  sensitivityUpperPct: number | null;
}

export interface ConfirmedDropoutSummary {
  arms: Record<'control' | 'intervention', DropoutArmSummary>;
  comparison: ProportionComparison | null;
  comparisonStatus: 'complete' | 'missing_outcomes' | 'insufficient_groups';
  sensitivityDifferencePct: [number, number] | null;
}

export interface MentorReviewCandidate {
  studentId: string;
  studentCode: string;
  activityGroup?: string | null;
  openSupportRequests: number;
  weeklySummaries: {
    weekStart: string;
    pctCurrent: number | null;
    plannedCurrent: number;
    weeklyStatus?: string | null;
  }[];
}

export interface MentorReviewSignal extends Omit<MentorReviewCandidate, 'weeklySummaries'> {
  decliningThreeWeekCompletion: boolean;
  latestWeek: string | null;
  latestCompletionPct: number | null;
  previousCompletionPct: number | null;
}

export function buildMentorReviewSignals(candidates: MentorReviewCandidate[]): MentorReviewSignal[] {
  return candidates.flatMap((candidate) => {
    const eligibleWeeks = candidate.weeklySummaries
      .filter((week) => (
        week.plannedCurrent > 0
        && week.pctCurrent != null
        && week.weeklyStatus !== 'resting'
      ))
      .sort((left, right) => left.weekStart.localeCompare(right.weekStart));
    const latestThreeWeeks = eligibleWeeks.slice(-3);
    const haveThreeAdjacentWeeks = latestThreeWeeks.length === 3
      && latestThreeWeeks.every((week, index) => index === 0 || (
        new Date(`${week.weekStart}T12:00:00`).getTime()
        - new Date(`${latestThreeWeeks[index - 1].weekStart}T12:00:00`).getTime()
      ) === 7 * 24 * 60 * 60 * 1000);
    const decliningThreeWeekCompletion = Boolean(
      haveThreeAdjacentWeeks
      && latestThreeWeeks[0].pctCurrent! > latestThreeWeeks[1].pctCurrent!
      && latestThreeWeeks[1].pctCurrent! > latestThreeWeeks[2].pctCurrent!
    );

    if (candidate.openSupportRequests <= 0 && !decliningThreeWeekCompletion) return [];
    const latest = eligibleWeeks[eligibleWeeks.length - 1];
    const previous = eligibleWeeks[eligibleWeeks.length - 2];
    return [{
      studentId: candidate.studentId,
      studentCode: candidate.studentCode,
      activityGroup: candidate.activityGroup,
      openSupportRequests: candidate.openSupportRequests,
      decliningThreeWeekCompletion,
      latestWeek: latest?.weekStart || null,
      latestCompletionPct: latest?.pctCurrent ?? null,
      previousCompletionPct: previous?.pctCurrent ?? null
    }];
  }).sort((left, right) => (
    right.openSupportRequests - left.openSupportRequests
    || Number(right.decliningThreeWeekCompletion) - Number(left.decliningThreeWeekCompletion)
    || (left.latestCompletionPct ?? 101) - (right.latestCompletionPct ?? 101)
  ));
}

export function summarizeConfirmedDropouts(rows: ConfirmedStudyOutcome[]): ConfirmedDropoutSummary {
  const summarizeArm = (arm: 'control' | 'intervention'): DropoutArmSummary => {
    const armRows = rows.filter((row) => row.arm === arm);
    const hasFinalOutcome = (row: ConfirmedStudyOutcome) => (
      row.consentState === 'active'
      && row.assignmentDateSource === 'recorded'
      && row.followUpComplete
      && ['continuing', 'achieved', 'dropout_confirmed'].includes(row.outcome || '')
    );
    const withdrawn = armRows.filter((row) => row.consentState === 'withdrawn').length;
    const consentMissing = armRows.filter((row) => row.consentState === 'consent_missing').length;
    const confirmedDropouts = armRows.filter((row) => row.consentState === 'active' && row.outcome === 'dropout_confirmed').length;
    const knownOutcomes = armRows.filter(hasFinalOutcome).length;
    const unresolved = armRows.length - knownOutcomes;
    const followUpNotDue = armRows.filter((row) => (
      row.consentState === 'active'
      && row.assignmentDateSource === 'recorded'
      && !row.followUpDue
      && !hasFinalOutcome(row)
    )).length;
    const assignmentDateUnknown = armRows.filter((row) => (
      row.consentState === 'active'
      && row.assignmentDateSource !== 'recorded'
      && !hasFinalOutcome(row)
    )).length;
    const missingFinalOutcome = armRows.filter((row) => (
      row.consentState === 'active'
      && row.assignmentDateSource === 'recorded'
      && row.followUpDue
      && !hasFinalOutcome(row)
    )).length;
    const randomized = armRows.length;
    const rateInterval = randomized > 0 && unresolved === 0
      ? wilsonScoreInterval(confirmedDropouts, randomized)
      : null;

    return {
      arm,
      randomized,
      confirmedDropouts,
      knownOutcomes,
      unresolved,
      withdrawn,
      consentMissing,
      followUpNotDue,
      missingFinalOutcome,
      assignmentDateUnknown,
      confirmedRatePct: randomized ? (confirmedDropouts / randomized) * 100 : null,
      confirmedRateCI95: rateInterval ? [rateInterval[0] * 100, rateInterval[1] * 100] : null,
      sensitivityLowerPct: randomized ? (confirmedDropouts / randomized) * 100 : null,
      sensitivityUpperPct: randomized ? ((confirmedDropouts + unresolved) / randomized) * 100 : null
    };
  };

  const arms = {
    control: summarizeArm('control'),
    intervention: summarizeArm('intervention')
  };
  const hasBothGroups = arms.control.randomized > 0 && arms.intervention.randomized > 0;
  const complete = hasBothGroups && arms.control.unresolved === 0 && arms.intervention.unresolved === 0;
  const comparison = complete
    ? compareBinaryProportions(
      arms.intervention.confirmedDropouts,
      arms.intervention.randomized,
      arms.control.confirmedDropouts,
      arms.control.randomized
    )
    : null;
  const sensitivityDifferencePct: [number, number] | null = hasBothGroups
    ? [
      (arms.intervention.sensitivityLowerPct || 0) - (arms.control.sensitivityUpperPct || 0),
      (arms.intervention.sensitivityUpperPct || 0) - (arms.control.sensitivityLowerPct || 0)
    ]
    : null;

  return {
    arms,
    comparison,
    comparisonStatus: !hasBothGroups ? 'insufficient_groups' : complete ? 'complete' : 'missing_outcomes',
    sensitivityDifferencePct
  };
}
