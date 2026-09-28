'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load, plain } = require('./harness');
const data = require('../sample_data/hires.json');

const ctx = load(['BusinessCalendar.js', 'OnboardingPlanBuilder.js', 'HrCaseRouter.js']);
const cal = new ctx.BusinessCalendar(data.holidays);

test('calendar skips weekends and Thanksgiving', () => {
  assert.strictEqual(cal.addBusinessDays('2026-11-30', -1), '2026-11-25'); // Mon -> prior Wed (Thu/Fri holidays)
  assert.strictEqual(cal.addBusinessDays('2026-11-30', -5), '2026-11-19');
  assert.strictEqual(cal.addBusinessDays('2026-12-24', 1), '2026-12-28');
  assert.strictEqual(cal.isBusinessDay('2026-12-25'), false);
});

test('remote engineering employee plan', () => {
  const plan = plain(new ctx.OnboardingPlanBuilder(cal).build(data.hires[0], '2026-11-01'));
  const ids = plan.tasks.map((t) => t.id);
  assert.ok(ids.includes('ship_laptop') && ids.includes('eng_access') && ids.includes('bg_check'));
  assert.ok(!ids.includes('badge') && !ids.includes('fin_access'));
  const byId = Object.fromEntries(plan.tasks.map((t) => [t.id, t]));
  assert.strictEqual(byId.identity.due, '2026-11-19');
  assert.strictEqual(byId.ship_laptop.due, '2026-11-23');
  assert.deepStrictEqual(byId.ship_laptop.dependsOn, ['laptop']);
  assert.strictEqual(byId.welcome.assignmentGroup, 'mgr.eng');
  assert.strictEqual(plan.warnings.length, 0);
  // sorted by due date
  assert.deepStrictEqual(plan.tasks.map((t) => t.due), [...plan.tasks.map((t) => t.due)].sort());
});

test('on-site finance contractor plan and late warning', () => {
  const plan = plain(new ctx.OnboardingPlanBuilder(cal).build(data.hires[1], '2026-09-30'));
  const ids = plan.tasks.map((t) => t.id);
  assert.ok(ids.includes('badge') && ids.includes('desk') && ids.includes('fin_access'));
  assert.ok(!ids.includes('payroll') && !ids.includes('bg_check') && !ids.includes('ship_laptop'));
  assert.ok(ids.includes('offer_docs') && !ids.includes('i9_verify'));
  assert.match(plan.warnings.join(), /past due/);
});

test('dependencies are dropped when prerequisite is not in plan', () => {
  const b = new ctx.OnboardingPlanBuilder(cal, [
    { id: 'a', name: 'A', group: 'G', offset: 0, when: { remote: true } },
    { id: 'b', name: 'B', group: 'G', offset: 1, dependsOn: ['a'] }
  ]);
  const plan = plain(b.build({ startDate: '2026-10-05', remote: false, managerId: 'm' }));
  assert.deepStrictEqual(plan.tasks.map((t) => [t.id, t.dependsOn]), [['b', []]]);
});

test('HR case routing: first match wins', () => {
  const r = new ctx.HrCaseRouter();
  assert.strictEqual(r.route({ coe: 'payroll', country: 'CA' }).assignmentGroup, 'Payroll - Canada');
  assert.strictEqual(r.route({ coe: 'payroll', country: 'US' }).assignmentGroup, 'Payroll - US');
  assert.strictEqual(r.route({ coe: 'unknown' }).assignmentGroup, 'HR Tier 1');
});

test('HR case routing: ER and medical leave are restricted', () => {
  const r = new ctx.HrCaseRouter();
  assert.strictEqual(r.route({ coe: 'employee_relations' }).restricted, true);
  const loa = r.route({ coe: 'hr', service: 'leave_of_absence', topic: 'medical' });
  assert.strictEqual(loa.assignmentGroup, 'Leave & Accommodations');
  assert.strictEqual(loa.restricted, true);
  assert.strictEqual(loa.escalate, false);
});

test('HR case routing: sensitive words on general case restrict and escalate', () => {
  const res = new ctx.HrCaseRouter().route({ coe: 'benefits', short_description: 'Question', description: 'I feel I faced retaliation after my claim' });
  assert.strictEqual(res.assignmentGroup, 'Benefits Tier 2');
  assert.strictEqual(res.restricted, true);
  assert.strictEqual(res.escalate, true);
  assert.match(res.reason, /retaliat/);
});
