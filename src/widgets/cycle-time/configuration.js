(() => {
    /* PUBLIC */
    window.WidgetConfiguration = {
        init: (WidgetHelpers) => {
            widgetHelpers = WidgetHelpers;
        },

        load: (widgetSettings, widgetConfigurationContext) => {
            context = widgetConfigurationContext;

            var settings = getSettings(widgetSettings);
            prepareControls(settings);

            return widgetHelpers.WidgetStatusHelper.Success();
        },

        save: (widgetSettings) => {
            return widgetHelpers.WidgetConfigurationSave.Valid(getSettingsToSave());
        }
    };

    /* PRIVATE */
    var context;
    var widgetHelpers;

    var $title = $('#title');
    var $query = $('#query');
    var $cycleTimeStartField = $('#cycle-time-start-field');
    var $cycleTimeEndField = $('#cycle-time-end-field');
    var $percentiles = $('#percentiles');

    var addQueryToSelect = (query, level) => {
        level = level ?? 0;

        if (query.isFolder ?? false) {
            $query.append($('<option>')
                .val(query.id)
                .html('&nbsp;&nbsp;'.repeat(level) + query.name)
                .attr('data-level', '0')
                .css('font-weight', 'bold')
                .attr('disabled', 'disabled'));

            if (query.children.length > 0)
            {
                query.children.forEach(innerQuery => {
                    addQueryToSelect(innerQuery, level + 1);
                });
            }

        } else {
            $query.append($('<option>')
                .val(query.id)
                .html('&nbsp;&nbsp;'.repeat(level) + query.name)
                .attr('data-level', level));
        }
    };

    var changeSettings = () => {
        settings = getSettingsToSave();

        var eventName = widgetHelpers.WidgetEvent.ConfigurationChange;
        var eventArgs = widgetHelpers.WidgetEvent.Args(settings);
        context.notify(eventName, eventArgs);
    };

    var getSettings = (widgetSettings) => {
        var settings = JSON.parse(widgetSettings.customSettings.data);

        return {
            title: settings?.title ?? 'Cycle Time',
            query: settings?.query ?? '',
            cycleTimeStartField: settings?.cycleTimeStartField ?? '',
            cycleTimeEndField: settings?.cycleTimeEndField ?? '',
            percentiles: settings?.percentiles ?? ''
        };
    };

    var getSettingsToSave = () => {
        var percentiles = $percentiles
            .val()
            .split(',')
            .filter(p => !isNaN(parseInt(p, 10)))
            .join(',');

        return {
            data: JSON.stringify({
                title: $title.val(),
                query: $query.val(),
                cycleTimeStartField: $cycleTimeStartField.val(),
                cycleTimeEndField: $cycleTimeEndField.val(),
                percentiles: percentiles
            })
        };
    };

    var prepareControls = (settings) => {
        var deferred = $.Deferred();

        window.AzureDevOpsProxy.getSharedQueries().then(queries => {
            $query.append($('<option>'));

            queries.forEach(query => {
                addQueryToSelect(query);
            });

            $title.on('change', changeSettings);
            $query.on('change', () => {
                var deferreds = [];                
                deferreds.push(updateDateFields($cycleTimeStartField, $cycleTimeStartField.val()));
                deferreds.push(updateDateFields($cycleTimeEndField, $cycleTimeEndField.val()));

                Promise.all(deferreds).then(result => {
                    changeSettings();
                });
            });
            $cycleTimeStartField.on('change', changeSettings);
            $cycleTimeEndField.on('change', changeSettings);
            $percentiles.on('change', changeSettings);

            $title.val(settings.title);
            $query.val(settings.query);
            $percentiles.val(settings.percentiles);

            var deferreds = [];                
            deferreds.push(updateDateFields($cycleTimeStartField, settings.cycleTimeStartField));
            deferreds.push(updateDateFields($cycleTimeEndField, settings.cycleTimeEndField));

            Promise.all(deferreds).then(result => {
                deferred.resolve();
            });

            deferred.resolve();
        });

        return deferred.promise();
    };

    var updateDateFields = (dateField, currentValue) => {
        var deferred = $.Deferred();

        window.AzureDevOpsProxy.getQueryDateFields($query.val()).then(fields => {
            dateField.html('');

            fields.forEach(field => {
                dateField.append($('<option>')
                    .val(field.referenceName)
                    .html(field.name));
            });

            if (fields.filter(field => field.referenceName == currentValue).length > 0)
            {
                dateField.val(currentValue);
            }
            else
            {
                dateField.val('');
            }

            deferred.resolve();
        });

        return deferred.promise();
    };
})();