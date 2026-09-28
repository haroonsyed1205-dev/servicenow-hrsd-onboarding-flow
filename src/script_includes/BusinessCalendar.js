/**
 * BusinessCalendar
 * Adds/subtracts business days, skipping weekends and listed holidays.
 * On-platform, a GlideSchedule does this; this version keeps due-date
 * logic testable and is used by OnboardingPlanBuilder.
 */
var BusinessCalendar = Class.create();
BusinessCalendar.prototype = {
    initialize: function (holidays) {
        this.holidays = {};
        (holidays || []).forEach(function (h) { this.holidays[h] = true; }, this);
    },

    isBusinessDay: function (iso) {
        var d = this._date(iso);
        var dow = d.getUTCDay();
        return dow !== 0 && dow !== 6 && !this.holidays[iso];
    },

    addBusinessDays: function (iso, n) {
        var d = this._date(iso);
        var step = n < 0 ? -1 : 1;
        var left = Math.abs(n);
        while (left > 0) {
            d.setUTCDate(d.getUTCDate() + step);
            if (this.isBusinessDay(this._iso(d))) left--;
        }
        return this._iso(d);
    },

    _date: function (iso) {
        var p = iso.split('-');
        return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    },

    _iso: function (d) {
        return d.toISOString().substring(0, 10);
    },

    type: 'BusinessCalendar'
};
