import assert from 'node:assert/strict';
import test from 'node:test';

import { getBarrierTheme, getInvitePriority, getInviteProgressState } from './supportInviteState';

test('invite priority is higher for overload and time barriers', () => {
  assert.equal(getInvitePriority('fatigue_overload'), 'high');
  assert.equal(getInvitePriority('time'), 'high');
  assert.equal(getInvitePriority('lack_progress'), 'medium');
  assert.equal(getInvitePriority('change_goal'), 'medium');
  assert.equal(getInvitePriority(undefined), 'medium');
});

test('invite progress state reflects the current response stage', () => {
  assert.deepEqual(getInviteProgressState('sent'), { percent: 42, label: 'Đang chờ phản hồi' });
  assert.deepEqual(getInviteProgressState('snoozed'), { percent: 72, label: 'Đang hoãn' });
  assert.deepEqual(getInviteProgressState('accepted'), { percent: 100, label: 'Đã áp dụng' });
  assert.deepEqual(getInviteProgressState('declined'), { percent: 88, label: 'Đã từ chối' });
});

test('barrier themes use distinct colors and handle unknown values', () => {
  assert.notEqual(getBarrierTheme('fatigue_overload').badge, getBarrierTheme('time').badge);
  assert.notEqual(getBarrierTheme('task_difficulty').progress, getBarrierTheme('no_companion').progress);
  assert.deepEqual(getBarrierTheme('unknown'), getBarrierTheme());
});
