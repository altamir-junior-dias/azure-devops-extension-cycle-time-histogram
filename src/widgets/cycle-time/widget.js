(() => {
    /* PUBLIC */

    window.Widget = {
        load: (widgetSettings) => {
            var settings = getSettings(widgetSettings); 

            $('#title').text(settings.title);

            getData(settings).then(data => {
                prepareChart(data, settings.percentiles);
            });

            return window.WidgetHelpers.WidgetStatusHelper.Success();
        }
    };

    /* PRIVATE */

    var getChartConfiguration = (data, percentiles) => {
        var config = {
            type: 'BarPercentile',
            data: {
                labels: data.map(d => d.cycleTime),
                datasets: [
                    {
                        label: "Items",
                        backgroundColor: "#79AEC8",
                        borderColor: "#417690",
                        data: data.map(d => d.items),
                        percentiles: percentiles != '' ? percentiles.split(',').map(percentile => parseInt(percentile, 10)) : []
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 3,
                scales: { y: { title: { text: 'Items', display: 'true' } }, x: { title: { text: 'Cycle Times', display: 'true' } } },
                plugins: {
                    title:  { display: false },
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        };

        return config;
    };

    var getData = (settings) => {
        var deferred = $.Deferred();

        window.AzureDevOpsProxy.getQueryWiql(settings.query, false).then(query => {
            window.AzureDevOpsProxy.getItemsFromQuery(query, true).then(items => {
                var cycleTimes = [];

                items.forEach(item => {
                    var startValue = item[settings.cycleTimeStartField];
                    var endValue = item[settings.cycleTimeEndField];

                    if (startValue !== undefined && startValue != null && startValue != '' && endValue !== undefined && endValue != null && endValue != '')
                    {
                        var startDate = new Date(startValue);
                        var endDate = new Date(endValue);

                        cycleTimes.push(Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1);
                    }
                });

                var groups = cycleTimes.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), Object.create(null));
                var min = Math.min(...cycleTimes);
                var max = Math.max(...cycleTimes);

                var items = [];
                for (var index = min; index <= max; index++) {
                    items.push({ cycleTime: index, items: groups[index] ?? 0 });
                }

                deferred.resolve(items);
            });
        });

        return deferred.promise();
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

    var prepareChart = (data, percentiles) => {
        $('#chart').show();
        $('#message').hide();

        if (data.length == 0) {
            $('#chart').hide();
            $('#message').show();

            $('#message').text('There aren\'t data to show');
        }

        var chartArea = document.getElementById('chart');
        var chart = new Chart(chartArea, getChartConfiguration(data, percentiles));
    }; 
})();