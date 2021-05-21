var $table = $('#table'),
    selections = [];

function initTable() {
    $table.bootstrapTable({
        height: getHeight(),
        locale: 'cs-CZ',
        columns: [
            {
                field: 'dtCreated',
                title: 'Vytvořeno',
                align: 'center',
                sortable: false,
                formatter: dateFormatter
            }, {
                field: 'msg',
                title: 'Log',
                sortable: false,
                align: 'left'
            }
        ]
    });
    // sometimes footer render error.
    setTimeout(function () {
        $table.bootstrapTable('resetView');
    }, 200);
    $(window).resize(function () {
        $table.bootstrapTable('resetView', {
            height: getHeight()
        });
    });
}

function getHeight() {
    return $(window).height() - $('h1').outerHeight(true);
}

$(function () {
    var scripts = [
            location.search.substring(1) || 'assets/bootstrap-table/src/bootstrap-table.js',
            'assets/bootstrap-table/src/extensions/export/bootstrap-table-export.js'
        ],
        eachSeries = function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length) {
                return callback();
            }
            var completed = 0;
            var iterate = function () {
                iterator(arr[completed], function (err) {
                    if (err) {
                        callback(err);
                        callback = function () {};
                    }
                    else {
                        completed += 1;
                        if (completed >= arr.length) {
                            callback(null);
                        }
                        else {
                            iterate();
                        }
                    }
                });
            };
            iterate();
        };

    eachSeries(scripts, getScript, initTable);
});

function getScript(url, callback) {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.src = url;

    var done = false;
    // Attach handlers for all browsers
    script.onload = script.onreadystatechange = function() {
        if (!done && (!this.readyState ||
                this.readyState == 'loaded' || this.readyState == 'complete')) {
            done = true;
            if (callback)
                callback();

            // Handle memory leak in IE
            script.onload = script.onreadystatechange = null;
        }
    };

    head.appendChild(script);

    // We handle everything using the script element injection
    return undefined;
}

function dateFormatter(value, row, index) {
    if (value===undefined) return '';
    var date = new Date(value);
    var dh = date.getHours();
    var dm = date.getMinutes();
    return date.getDate() + '.' + (date.getMonth()+1) + '.' + date.getFullYear() + ' ' + (dh<10?'0':'') + dh + ':' + (dm<10?'0':'') + dm;
}
