# Design notes

## Onboarding plan
Activities are data (`OnboardingPlanBuilder.ACTIVITIES`): each has an owner
group, a due offset in business days from the start date, optional
conditions (`when`) and dependencies. That makes the plan reviewable with HR
before it is built, and easy to change without rewriting flow logic.

| Condition | Adds |
|---|---|
| Employee (not contractor) | Background check, payroll & benefits, I-9 section 2 (US) |
| Remote | Ship laptop to home |
| On-site | Badge, desk |
| Engineering job family | Source control and cloud access |
| Finance department | ERP access with segregation-of-duties review |

Due dates skip weekends and the holiday schedule. If the start date is so
close that tasks are already past due, the case gets a warning work note.

## Flow Designer version
1. Trigger: HR lifecycle event case created, HR service = New Hire Onboarding.
2. Action "Build onboarding plan" (script step calling `OnboardingPlanBuilder`) returns the task list.
3. For Each task: Create HR Task; set Pending if it has dependencies.
4. Wait for condition on prerequisite tasks, then set dependents to Ready.

## Case routing and confidentiality
- Rules are first-match, most specific first, with a Tier 1 catch-all.
- Employee Relations and medical leave cases are always restricted.
- Any case whose text mentions harassment, discrimination, retaliation,
  medical or similar terms is restricted and escalated for ER review, even
  if it was raised under a general service. Restriction sets `u_restricted`,
  which a read ACL uses to limit visibility to the assignment group and HR
  admins.
