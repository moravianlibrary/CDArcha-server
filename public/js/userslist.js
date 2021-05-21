var $table = $('#table'),
    $remove = $('#remove'),
    selections = [];

function initTable() {
    $table.bootstrapTable({
        height: getHeight(),
        locale: 'cs-CZ',
        columns: [
            {
                title: 'ID',
                field: '_id',
                align: 'left',
                valign: 'middle',
                sortable: true,
                visible: false
            }, {
                field: 'email',
                title: 'Email',
                sortable: true,
                align: 'center'
            }, {
                field: 'sigla',
                title: 'Sigla',
                align: 'center',
                sortable: true
            }, {
                field: 'roleType',
                title: 'Role',
                align: 'center',
                sortable: true,
                formatter: roleFormatter
            }, {
                field: 'createdAt',
                title: 'Vytvořeno',
                align: 'center',
                sortable: true,
                formatter: dateFormatter
            }, {
                field: 'operate',
                title: 'Operace',
                align: 'center',
                events: operateEvents,
                formatter: operateFormatter
            }
        ]
    });
    // sometimes footer render error.
    setTimeout(function () {
        $table.bootstrapTable('resetView');
    }, 200);
    $remove.click(function () {
        var ids = getIdSelections();
        $table.bootstrapTable('remove', {
            field: 'id',
            values: ids
        });
    });
    $(window).resize(function () {
        $table.bootstrapTable('resetView', {
            height: getHeight()
        });
    });
}

function getIdSelections() {
    return $.map($table.bootstrapTable('getSelections'), function (row) {
        return row.id
    });
}

function operateFormatter(value, row, index) {
    return [
        '<a class="edit" href="javascript:void(0)" title="Upravit">',
        '<i class="glyphicon glyphicon-edit"></i>',
        '</a>  &nbsp;',
        '<a class="remove" href="javascript:void(0)" title="Odstránit">',
        '<i class="glyphicon glyphicon-remove"></i>',
        '</a>'
    ].join('');
}

function roleFormatter(value, row, index) {
    switch (row.roleType) {
      case 0: return '<strong>Sysadmin</strong>'; break;
      case 1: return '<strong>Kurátor</strong>'; break;
      case 2: return '<strong>Archivátor</strong>'; break;
    }
}

window.operateEvents = {
    'click .edit': function (e, value, row, index) {
        window.location.href = '/cdarcha/userslist/edit/'+row._id;
    },
    'click .remove': function (e, value, row, index) {
        var r = confirm("Skutečne smazat uživatele " + row.email + " ?");
        if (r === true) {
          window.location.href = '/cdarcha/userslist/remove/'+row._id;
        }
    }
};

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
    return date.getDate() + '.' + date.getMonth() + '.' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes();
}
