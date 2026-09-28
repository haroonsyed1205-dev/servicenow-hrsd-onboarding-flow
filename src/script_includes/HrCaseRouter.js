/**
 * HrCaseRouter
 * Routes an HR case to the right COE assignment group and flags cases that
 * must be restricted (sensitive topics). Rules are evaluated top to bottom;
 * first match wins, the same way HR matching rules behave.
 */
var HrCaseRouter = Class.create();
HrCaseRouter.RULES = [
    { match: { coe: 'employee_relations' }, group: 'ER Investigations', restricted: true },
    { match: { service: 'leave_of_absence', topic: 'medical' }, group: 'Leave & Accommodations', restricted: true },
    { match: { coe: 'payroll', country: 'CA' }, group: 'Payroll - Canada' },
    { match: { coe: 'payroll' }, group: 'Payroll - US' },
    { match: { coe: 'benefits' }, group: 'Benefits Tier 2' },
    { match: { coe: 'talent' }, group: 'Talent Management' },
    { match: { coe: 'global_mobility' }, group: 'Global Mobility' },
    { match: {}, group: 'HR Tier 1' }
];
HrCaseRouter.SENSITIVE_WORDS = ['harass', 'discriminat', 'retaliat', 'medical', 'disability', 'pregnan', 'whistle'];
HrCaseRouter.prototype = {
    initialize: function (rules) {
        this.rules = rules || HrCaseRouter.RULES;
    },

    route: function (hrCase) {
        var c = hrCase || {};
        var rule = null;
        for (var i = 0; i < this.rules.length; i++) {
            var m = this.rules[i].match;
            var ok = Object.keys(m).every(function (k) { return c[k] === m[k]; });
            if (ok) { rule = this.rules[i]; break; }
        }
        var text = ((c.short_description || '') + ' ' + (c.description || '')).toLowerCase();
        var flagged = HrCaseRouter.SENSITIVE_WORDS.filter(function (w) { return text.indexOf(w) > -1; });

        var restricted = !!rule.restricted || flagged.length > 0;
        return {
            assignmentGroup: rule.group,
            restricted: restricted,
            // Sensitive text on a Tier 1 case is escalated to ER review rather than left in the general queue
            escalate: !rule.restricted && flagged.length > 0,
            reason: flagged.length ? 'Sensitive terms: ' + flagged.join(', ') : ''
        };
    },

    type: 'HrCaseRouter'
};
