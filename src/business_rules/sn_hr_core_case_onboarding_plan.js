/**
 * Business Rule: Generate onboarding plan
 * Table: sn_hr_le_case (lifecycle event case)   When: after   Insert: true
 * Condition: current.hr_service.value == 'new_hire_onboarding'
 * Creates one HR task per activity; dependent tasks start in "Pending" until
 * their prerequisites close (handled by a separate after-update rule).
 */
(function executeRule(current, previous) {
    var person = current.subject_person.getRefRecord();
    var profile = new GlideRecord('sn_hr_core_profile');
    profile.get('user', person.getUniqueValue());

    var holidays = [];
    var h = new GlideRecord('cmn_schedule_span');
    h.addQuery('schedule.name', gs.getProperty('x_hr_onboard.holiday_schedule', 'US Holidays'));
    h.query();
    while (h.next()) holidays.push(h.start_date_time.getGlideObject().getLocalDate().getValue());

    var plan = new OnboardingPlanBuilder(new BusinessCalendar(holidays)).build({
        startDate: profile.getValue('employment_start_date'),
        department: (person.department.name + '').toLowerCase(),
        jobFamily: (profile.getValue('u_job_family') || '').toLowerCase(),
        workerType: profile.getValue('employee_type') == 'contractor' ? 'contractor' : 'employee',
        remote: profile.getValue('work_location_type') == 'remote',
        managerId: person.getValue('manager'),
        country: person.location.country + ''
    }, new GlideDate().getValue());

    var created = {};
    plan.tasks.forEach(function (t) {
        var task = new GlideRecord('sn_hr_core_task');
        task.initialize();
        task.setValue('parent', current.getUniqueValue());
        task.setValue('short_description', t.name);
        task.setValue('due_date', t.due + ' 17:00:00');
        task.setValue('u_activity_id', t.id);
        if (t.assignmentGroup === 'new_hire') task.setValue('assigned_to', person.getUniqueValue());
        else if (t.assignmentGroup === person.getValue('manager')) task.setValue('assigned_to', t.assignmentGroup);
        else {
            var g = new GlideRecord('sys_user_group');
            if (g.get('name', t.assignmentGroup)) task.setValue('assignment_group', g.getUniqueValue());
        }
        task.setValue('state', t.dependsOn.length ? '-5' : '10'); // Pending / Ready
        created[t.id] = task.insert();
    });
    plan.warnings.forEach(function (w) { current.work_notes = w; });
    if (plan.warnings.length) current.update();
})(current, previous);
