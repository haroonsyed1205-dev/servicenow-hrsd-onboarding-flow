/**
 * Business Rule: Route HR case
 * Table: sn_hr_core_case   When: before   Insert: true
 */
(function executeRule(current, previous) {
    var svc = current.hr_service.getRefRecord();
    var r = new HrCaseRouter().route({
        coe: current.getValue('sys_class_name').replace('sn_hr_core_case_', ''),
        service: svc.getValue('value'),
        topic: current.getValue('u_topic'),
        country: current.subject_person.location.country + '',
        short_description: current.getValue('short_description'),
        description: current.getValue('description')
    });

    var grp = new GlideRecord('sys_user_group');
    if (grp.get('name', r.assignmentGroup)) current.setValue('assignment_group', grp.getUniqueValue());

    if (r.restricted) {
        current.setValue('u_restricted', true); // drives the read ACL: assignment group + HR admins only
    }
    if (r.escalate) {
        current.setValue('work_notes', 'Auto-flagged for ER review. ' + r.reason);
        gs.eventQueue('x_hr_onboard.case.sensitive', current, r.reason, '');
    }
})(current, previous);
