import assert from 'node:assert/strict';
import test from 'node:test';
import {
  binSessionCountFrequencies,
  calculateStrictWeeklyCompletion,
  buildMentorReviewSignals,
  calculateTwoProportionSampleSize,
  compareBinaryProportions,
  frequencyTable,
  fisherExactTwoSided,
  findModes,
  summarizeConfirmedDropouts,
  summarizeNumericFrequencies,
  wilsonScoreInterval
} from './statistics';
import type { ConfirmedStudyOutcome } from '../types';

test('weighted descriptive statistics return mean, median and tied mode', () => {
  const summary = summarizeNumericFrequencies([
    { value: 1, count: 1 },
    { value: 2, count: 2 },
    { value: 3, count: 1 }
  ]);

  assert.equal(summary.n, 4);
  assert.equal(summary.mean, 2);
  assert.equal(summary.median, 2);
  assert.equal(summary.q1, 1.75);
  assert.equal(summary.q3, 2.25);
  assert.equal(summary.iqr, 0.5);
  assert.equal(summary.minimum, 1);
  assert.equal(summary.maximum, 3);
  assert.ok(Math.abs((summary.standardDeviation || 0) - Math.sqrt(2 / 3)) < 1e-12);
  assert.deepEqual(summary.modes, [2]);
});

test('quartile summary returns null for an empty frequency distribution', () => {
  const summary = summarizeNumericFrequencies([]);

  assert.equal(summary.n, 0);
  assert.equal(summary.q1, null);
  assert.equal(summary.q3, null);
  assert.equal(summary.standardDeviation, null);
});

test('session histogram bins conserve the input sample size', () => {
  const bins = binSessionCountFrequencies([
    { value: 0, count: 5 },
    { value: 1, count: 4 },
    { value: 2, count: 3 },
    { value: 4, count: 2 },
    { value: 8, count: 6 },
    { value: 12, count: 1 }
  ]);

  assert.deepEqual(bins.map((bin) => bin.count), [5, 7, 2, 6, 1]);
  assert.equal(bins.reduce((total, bin) => total + bin.count, 0), 21);
});

test('frequency table sorts numeric values and excludes missing observations', () => {
  assert.deepEqual(frequencyTable([3, null, 1, 3, undefined, 2]), [
    { value: 1, count: 1 },
    { value: 2, count: 1 },
    { value: 3, count: 2 }
  ]);
});

test('strict weekly completion counts only done logs and excludes nghỉ/no-plan weeks', () => {
  const rows = calculateStrictWeeklyCompletion({
    goalId: 'goal-a',
    weeklySummaries: [
      { weekStart: '2026-09-07', plannedCurrent: 2, plannedOriginal: 3 },
      { weekStart: '2026-09-14', plannedCurrent: 2, plannedOriginal: 2 },
      { weekStart: '2026-09-21', plannedCurrent: 2, plannedOriginal: 2 },
      { weekStart: '2026-09-28', plannedCurrent: 2, plannedOriginal: 2 }
    ],
    sessionLogs: [
      { goalId: 'goal-a', sessionDate: '2026-09-07', status: 'done' },
      { goalId: 'goal-a', sessionDate: '2026-09-08', status: 'partial' },
      { goalId: 'goal-a', sessionDate: '2026-09-09', status: 'missed' },
      { goalId: 'goal-b', sessionDate: '2026-09-10', status: 'done' },
      { goalId: 'goal-a', sessionDate: '2026-09-22', status: 'done' },
      { goalId: 'goal-a', sessionDate: '2026-10-04', status: 'done' }
    ],
    planVersions: [
      { goalId: 'goal-a', effectiveFrom: '2026-09-07' },
      { goalId: 'goal-a', effectiveFrom: '2026-10-04' }
    ],
    weeklyStatuses: [{ weekStart: '2026-09-21', status: 'resting' }],
    restPeriods: [{ dateFrom: '2026-09-14', dateTo: '2026-09-20' }]
  });

  assert.deepEqual(rows.map((row) => row.weekStart), ['2026-09-07', '2026-09-28']);
  assert.equal(rows[0].validDone, 1);
  assert.equal(rows[0].pctCurrent, 50);
  assert.ok(Math.abs((rows[0].pctOriginal || 0) - (100 / 3)) < 1e-12);
  assert.equal(rows[1].validDone, 1);
});

test('mentor review queue uses explicit requests and three adjacent declining weeks only', () => {
  const signals = buildMentorReviewSignals([
    {
      studentId: 'student-1',
      studentCode: 'HS-0001',
      openSupportRequests: 0,
      weeklySummaries: [
        { weekStart: '2026-09-07', pctCurrent: 80, plannedCurrent: 3 },
        { weekStart: '2026-09-14', pctCurrent: 60, plannedCurrent: 3 },
        { weekStart: '2026-09-21', pctCurrent: 40, plannedCurrent: 3 }
      ]
    },
    {
      studentId: 'student-2',
      studentCode: 'HS-0002',
      openSupportRequests: 0,
      weeklySummaries: [
        { weekStart: '2026-09-07', pctCurrent: 80, plannedCurrent: 3 },
        { weekStart: '2026-09-21', pctCurrent: 40, plannedCurrent: 3 },
        { weekStart: '2026-09-28', pctCurrent: 20, plannedCurrent: 3 }
      ]
    },
    {
      studentId: 'student-3',
      studentCode: 'HS-0003',
      openSupportRequests: 1,
      weeklySummaries: []
    }
  ]);

  assert.deepEqual(signals.map((signal) => signal.studentCode), ['HS-0003', 'HS-0001']);
  assert.equal(signals[0].decliningThreeWeekCompletion, false);
  assert.equal(signals[1].decliningThreeWeekCompletion, true);
});

test('mode is empty when every distinct value has the same frequency', () => {
  assert.deepEqual(findModes([
    { value: 'A', count: 3 },
    { value: 'B', count: 3 }
  ]), []);
});

test('Wilson interval remains bounded for zero and all successes', () => {
  const noEvents = wilsonScoreInterval(0, 10);
  const allEvents = wilsonScoreInterval(10, 10);

  assert.ok(noEvents);
  assert.ok(allEvents);
  assert.equal(noEvents[0], 0);
  assert.ok(noEvents[1] > 0);
  assert.ok(allEvents[0] < 1);
  assert.equal(allEvents[1], 1);
});

test('Newcombe risk-difference interval contains the observed difference', () => {
  const result = compareBinaryProportions(7, 20, 1, 20);

  assert.ok(result);
  assert.ok(Math.abs(result.difference - 0.3) < 1e-12);
  assert.ok(result.ciLower <= result.difference);
  assert.ok(result.ciUpper >= result.difference);
  assert.equal(result.test, 'fisher_exact');
});

test('Fisher exact two-sided test matches a known sparse 2x2 table', () => {
  const pValue = fisherExactTwoSided(1, 10, 8, 10);

  assert.ok(pValue != null);
  assert.ok(Math.abs(pValue - 0.005477) < 0.00001);
});

test('large expected cells use the chi-square test', () => {
  const result = compareBinaryProportions(50, 100, 40, 100);

  assert.ok(result);
  assert.equal(result.test, 'chi_square');
  assert.ok(Math.abs(result.pValue - 0.155) < 0.002);
});

test('two-proportion sample size uses power and inflates for follow-up loss', () => {
  const plan = calculateTwoProportionSampleSize({
    controlDropoutPct: 40,
    minimumReductionPct: 20,
    alpha: 0.05,
    power: 0.8,
    expectedLossPct: 20
  });

  assert.ok(plan);
  assert.ok(plan.uninflatedPerArm >= 80 && plan.uninflatedPerArm <= 83);
  assert.ok(plan.perArmAfterLoss >= 102 && plan.perArmAfterLoss <= 104);
  assert.equal(plan.totalAfterLoss, plan.perArmAfterLoss * 2);
  assert.equal(calculateTwoProportionSampleSize({
    controlDropoutPct: 10,
    minimumReductionPct: 12,
    alpha: 0.05,
    power: 0.8,
    expectedLossPct: 20
  }), null);
});

const outcome = (
  arm: 'control' | 'intervention',
  consentState: ConfirmedStudyOutcome['consentState'],
  value: ConfirmedStudyOutcome['outcome']
): ConfirmedStudyOutcome => ({
  studentCode: `${arm}-${consentState}-${value || 'missing'}`,
  arm,
  consentState,
  assignedAt: '2026-01-05T00:00:00.000Z',
  assignmentDateSource: 'recorded',
  followUpDue: true,
  followUpComplete: value != null && value !== 'unknown' && value !== 'resting',
  outcome: value,
  effectiveDate: null,
  weekStart: null,
  confirmerRole: null,
  definitionVersion: null,
  recordedAt: null
});

test('incomplete and withdrawn outcomes stay unresolved and suppress inference', () => {
  const result = summarizeConfirmedDropouts([
    outcome('intervention', 'active', 'dropout_confirmed'),
    outcome('intervention', 'active', null),
    outcome('control', 'active', 'continuing'),
    outcome('control', 'withdrawn', null)
  ]);

  assert.equal(result.comparisonStatus, 'missing_outcomes');
  assert.equal(result.comparison, null);
  assert.equal(result.arms.intervention.unresolved, 1);
  assert.equal(result.arms.control.withdrawn, 1);
  assert.deepEqual(result.sensitivityDifferencePct, [0, 100]);
});

test('continuing status before the eighth-week endpoint is not treated as a final outcome', () => {
  const provisional = {
    ...outcome('intervention', 'active', 'continuing'),
    followUpDue: false,
    followUpComplete: false
  };
  const result = summarizeConfirmedDropouts([
    provisional,
    outcome('control', 'active', 'continuing')
  ]);

  assert.equal(result.comparisonStatus, 'missing_outcomes');
  assert.equal(result.comparison, null);
  assert.equal(result.arms.intervention.knownOutcomes, 0);
  assert.equal(result.arms.intervention.followUpNotDue, 1);
});

test('legacy proxy assignment dates are not used for the primary eight-week outcome', () => {
  const legacyOutcome = {
    ...outcome('intervention', 'active', 'dropout_confirmed'),
    assignmentDateSource: 'legacy_approved_at' as const
  };
  const result = summarizeConfirmedDropouts([
    legacyOutcome,
    outcome('control', 'active', 'continuing')
  ]);

  assert.equal(result.comparison, null);
  assert.equal(result.arms.intervention.knownOutcomes, 0);
  assert.equal(result.arms.intervention.assignmentDateUnknown, 1);
});

test('complete randomized groups receive a comparison with a confidence interval', () => {
  const result = summarizeConfirmedDropouts([
    outcome('intervention', 'active', 'dropout_confirmed'),
    outcome('intervention', 'active', 'continuing'),
    outcome('control', 'active', 'continuing'),
    outcome('control', 'active', 'achieved')
  ]);

  assert.equal(result.comparisonStatus, 'complete');
  assert.ok(result.comparison);
  assert.equal(result.comparison.difference, 0.5);
  assert.equal(result.comparison.test, 'fisher_exact');
});
