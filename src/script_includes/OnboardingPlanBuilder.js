/**
 * OnboardingPlanBuilder
 * Builds the onboarding activity plan for a new hire: which tasks, which
 * fulfiller group owns each, and when each is due relative to the start
 * date (in business days). Mirrors an Enterprise Onboarding activity set
 * with conditions, but as data so it can be reviewed and tested.
 *
 * hire = { name, startDate, department, location, jobFamily, workerType
 *          ('employee'|'contractor'), remote, managerId, country }
 */
var OnboardingPlanBuilder = Class.create();
OnboardingPlanBuilder.ACTIVITIES = [
    // offset = business days relative to start date (negative = before)
    { id: 'offer_docs', name: 'Collect signed offer and I-9 section 1', group: 'HR Operations', offset: -10, when: { country: 'US' } },
    { id: 'bg_check', name: 'Background check', group: 'HR Operations', offset: -10, when: { workerType: 'employee' } },
    { id: 'identity', name: 'Create AD account and email', group: 'Identity & Access', offset: -5 },
    { id: 'laptop', name: 'Provision laptop', group: 'End User Services', offset: -5, dependsOn: ['identity'] },
    { id: 'ship_laptop', name: 'Ship laptop to home address', group: 'End User Services', offset: -3, when: { remote: true }, dependsOn: ['laptop'] },
    { id: 'badge', name: 'Issue building badge', group: 'Facilities', offset: -2, when: { remote: false } },
    { id: 'desk', name: 'Assign desk', group: 'Facilities', offset: -2, when: { remote: false } },
    { id: 'payroll', name: 'Set up payroll and benefits enrolment', group: 'Payroll', offset: 0, when: { workerType: 'employee' } },
    { id: 'eng_access', name: 'Grant source control and cloud access', group: 'Identity & Access', offset: 0, when: { jobFamily: 'engineering' }, dependsOn: ['identity'] },
    { id: 'fin_access', name: 'Grant ERP access (SoD review)', group: 'Identity & Access', offset: 1, when: { department: 'finance' }, dependsOn: ['identity'] },
    { id: 'welcome', name: 'Manager welcome meeting', group: 'manager', offset: 0 },
    { id: 'i9_verify', name: 'Verify I-9 documents (section 2)', group: 'HR Operations', offset: 3, when: { country: 'US', workerType: 'employee' } },
    { id: 'training', name: 'Complete compliance training', group: 'new_hire', offset: 10 },
    { id: 'checkin_30', name: '30-day check-in', group: 'manager', offset: 21 }
];
OnboardingPlanBuilder.prototype = {
    initialize: function (calendar, activities) {
        this.calendar = calendar || new BusinessCalendar([]);
        this.activities = activities || OnboardingPlanBuilder.ACTIVITIES;
    },

    matches: function (when, hire) {
        if (!when) return true;
        return Object.keys(when).every(function (k) {
            var v = hire[k];
            if (typeof when[k] === 'string' && typeof v === 'string') return v.toLowerCase() === when[k].toLowerCase();
            return v === when[k];
        });
    },

    build: function (hire, todayIso) {
        var self = this;
        var chosen = this.activities.filter(function (a) { return self.matches(a.when, hire); });
        var ids = chosen.map(function (a) { return a.id; });
        var warnings = [];

        var tasks = chosen.map(function (a) {
            var due = self.calendar.addBusinessDays(hire.startDate, a.offset);
            if (a.offset === 0 && !self.calendar.isBusinessDay(hire.startDate)) {
                due = self.calendar.addBusinessDays(hire.startDate, 1);
            }
            var owner = a.group === 'manager' ? hire.managerId : (a.group === 'new_hire' ? 'new_hire' : a.group);
            return {
                id: a.id, name: a.name, assignmentGroup: owner, due: due,
                dependsOn: (a.dependsOn || []).filter(function (d) { return ids.indexOf(d) > -1; }),
                late: todayIso ? due < todayIso : false
            };
        });

        if (!this.calendar.isBusinessDay(hire.startDate)) warnings.push('Start date is not a business day');
        var late = tasks.filter(function (t) { return t.late; });
        if (late.length) {
            warnings.push(late.length + ' task(s) are already past due - start date may be too close');
        }
        if (!hire.managerId) warnings.push('No manager on the hire record; manager tasks are unassigned');

        tasks.sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
        return { tasks: tasks, warnings: warnings };
    },

    type: 'OnboardingPlanBuilder'
};
