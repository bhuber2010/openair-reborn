'use strict';

/*global $:false */
/*global app:false */

/**
 * A bunch of helper functions to get data from OA and put data into OA.
 */
app.service('OpenAirService', function() {

    var parent = this;

    /**
     * Returns the list of available projects in a key: value object.
     *
     * @returns {Object} projects
     */
    this.fetchProjects = function() {
        var projects = {};

        // Any Project select input will do, and we can be sure that there is
        // at least one on the page at all times, so just grab the first one
        // and loop through the options to build our list.
        $('.timesheetControlPopupCustomerProject').first().find('option').each(function () {
            if ($(this).text().length > 0) {
                projects[$(this).val()] = $(this).text();
            }
        });
        return projects;
    };

    /**
     * Returns the list of available tasks for a given project
     * in a key: value object.
     *
     * @param projectId
     * @returns {Object} tasks
     */
    this.fetchTasks = function(projectId) {
        var tasks = {};

        // Set the value of the last "Project" OA select (i.e., the empty one)
        // to be the one we just chose, behind the scenes.
        $('.timesheetControlPopupCustomerProject').last().val(projectId);

        // This is a horrible horrible hack. Chrome extensions don't have the
        // ability to .trigger('change'); on an element, which is the only "easy"
        // way to find the Tasks for a given Project. I.e., we need to trigger
        // a change to the Project select so that the Tasks select after it
        // will be populated, and we can grab those options. We can do that by
        // building our own <script> DOM element and inserting it. :(
        // Stolen/modified from http://stackoverflow.com/a/11388087, and yes
        // I tried the .dispatchEvent() idea first, and it didn't work.
        var s = document.createElement('script');
        s.textContent = "jQuery('.timesheetControlPopupCustomerProject').trigger('change')";
        s.onload = function () {
            this.parentNode.removeChild(this);
        };
        document.head.appendChild(s);

        // Now that the Tasks select input is populated, we can fetch the values out
        // of it. However, There are no sane CSS selectors for that select input,
        // so we end up with this monstrosity.
        $('.timesheetControlPopupCustomerProject').eq(-2).parent().next().find('option').each(function () {
            if ($(this).text().length > 0 && $(this).val() !== "0") {
                var label = $(this).text().split(': ')[1];
                tasks[$(this).val()] = label;
            }
        });
        return tasks;
    };


    /**
     * Cycles through the default OA timesheet and grabs time entries out of
     * it to populate the initial $scope.timeEntries on page load, which is
     * a multi-dimensional array grouped by the day of the week.
     *
     * @returns {Array} timeEntries
     */
    this.parseTimesheet = function() {
        var timeEntries = [];

        $('.timesheetHours').each(function () {
            var time = $(this).find('.timesheetInputHour').val();
            if (time.length < 1) {
                // We've reached the end! Abort!
                return;
            }
            var date = $(this).find('a').attr('data-additional-title').substring(0, 2).toLowerCase();
            var project = $(this).parents('tr').find('.timesheetControlPopupCustomerProject').val();
            var projectName = parent.fetchProjects()[project].split(' : ')[1];
            var task = $(this).parents('tr').find('.timesheetControlPopup').val();
            var taskName = $(this).parents('tr').find('.timesheetControlPopup option:selected').text().split(': ')[1];
            var notesID = $(this).find('a').attr('data-additional-prefix');
            var notes = parent.findNotes(notesID);
            if (!timeEntries[date]) {
                timeEntries[date] = [];
            }
            timeEntries[date].push({
                time: time,
                project: project,
                projectName: projectName,
                task: task,
                taskName: taskName,
                notes: notes
            });
        });
        return timeEntries;
    };


    /**
     * Given a notesID which is easy to find, find the actual notes which
     * are pants-on-head difficult to find, involving parsing JSON out of a
     * <script> tag and traversing it until you find the right ID.
     *
     * @param {string} notesID
     * @returns {string} notes
     */
    this.findNotes = function(notesID) {
        var timeData = JSON.parse($('#oa_model_timesheet').html());
        var notes = "test";
        angular.forEach(timeData.rows, function(row) {
            angular.forEach(row.fields, function(field) {
                if (field.id === notesID) {
                    notes = field.details.data.notes;
                }
            });
        });
        return notes;
    };
});