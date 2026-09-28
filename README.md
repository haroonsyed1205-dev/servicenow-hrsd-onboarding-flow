# ServiceNow HRSD Onboarding Flow

> Portfolio project: original code with synthetic data. See [DISCLAIMER.md](DISCLAIMER.md).

HR Service Delivery building blocks: a condition-driven new-hire onboarding
plan with business-day due dates and task dependencies, and HR case routing
to COE groups with automatic restriction of sensitive cases.

## What's inside
| Path | ServiceNow artifact | What it does |
|---|---|---|
| `src/script_includes/OnboardingPlanBuilder.js` | Script Include | Picks activities for the hire (remote/on-site, employee/contractor, department, job family), sets owners, due dates, dependencies |
| `src/script_includes/BusinessCalendar.js` | Script Include | Business-day arithmetic with holidays |
| `src/script_includes/HrCaseRouter.js` | Script Include | First-match COE routing, restriction and ER escalation for sensitive text |
| `src/business_rules/sn_hr_core_case_onboarding_plan.js` | Business Rule | Creates HR tasks from the plan on the onboarding lifecycle event case |
| `src/business_rules/sn_hr_core_case_route.js` | Business Rule | Sets assignment group and restriction on HR case insert |
| `docs/design.md` | — | Activity conditions, Flow Designer equivalent, confidentiality model |

## Example plan (remote engineer starting Mon 30 Nov 2026)
```
2026-11-12  Collect signed offer and I-9 section 1   HR Operations
2026-11-12  Background check                         HR Operations
2026-11-19  Create AD account and email              Identity & Access
2026-11-19  Provision laptop                         End User Services   (after identity)
2026-11-23  Ship laptop to home address              End User Services   (after laptop)
2026-11-30  Set up payroll and benefits enrolment    Payroll
2026-11-30  Grant source control and cloud access    Identity & Access
2026-11-30  Manager welcome meeting                  manager
...
```
Thanksgiving (26-27 Nov) is skipped when counting back from the start date.

## Run the tests
```
node --test
```

## Status
Logic is unit tested; platform scripts are being validated on a Personal
Developer Instance.
