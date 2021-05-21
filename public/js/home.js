var $tableArchive = $('#table-archive'),
    selections = [];

// ---------------------------------------
//   Archive
// ---------------------------------------

function initTableArchive(table) {
  table = table || $tableArchive;
  var hash = window.location.hash;
  //if (hash.length) {
  //  hash = hash.substring(1,hash.length);
  //  table.data('search-text', hash);
  //}
  table.bootstrapTable({
        height: getHeight(),
        locale: 'cs-CZ',
        columns: [
            {
                title: 'ID archivu',
                field: '_id',
                align: 'left',
                valign: 'middle',
                visible: false,
                sortable: true
            }, {
                title: 'UUID',
                field: 'uuid',
                align: 'left',
                valign: 'middle',
                visible: false,
                sortable: true
            }, {
                title: 'UUID + Titul',
                field: 'uuidTitle',
                align: 'left',
                valign: 'middle',
                sortable: true
            }, {
                title: 'Stav',
                field: 'status',
                align: 'left',
                valign: 'middle',
                sortable: true,
                formatter: statusFormatterArchive
            }, {
                title: 'Vytvořeno',
                field: 'dtCreated',
                align: 'left',
                valign: 'middle',
                sortable: true,
                formatter: dateFormatter
            }, {
                title: 'Poslední úprava',
                field: 'dtLastUpdate',
                align: 'left',
                valign: 'middle',
                sortable: true,
                formatter: dateFormatter
            }, {
                field: 'operate',
                title: 'Operace',
                align: 'right',
                events: operateEventsArchive,
                formatter: operateFormatterArchive
            }
        ],
    });
    // sometimes footer render error.
    setTimeout(function () {
        table.bootstrapTable('resetView');
    }, 200);
    $(window).resize(function () {
        table.bootstrapTable('resetView', {
            height: getHeight()
        });
    });
    $('#btn-back1').click(function(){
        $('#tab-container').css('margin-left', '0');
        $('h3').text($(this).data('title'));
        $('#subtitle').text($(this).data('subtitle'));
        $('.menu-biblio').addClass('active');
        $('.menu-archive').removeClass('active');
        $tableArchive.bootstrapTable('destroy');
        return false;
    });
}

function operateFormatterArchive(value, row, index) {
    return [
        '<a class="mount-archive" href="javascript:void(0)" title="Připojit do vašeho sdíleného adresáře">',
        '<i class="fa fa-plug"></i>',
        '</a> &nbsp; ',
        '<a class="unmount-archive" href="javascript:void(0)" title="Odpojit všechny archivy ze sdíleného adresáře">',
        '<i class="fa fa-power-off"></i>',
        '</a>'
    ].join('');
}

function statusFormatterArchive(value, row, index) {
    switch (row.status) {
      case 0: return '<strong class="bg-red">Rozpracované&nbsp;na&nbsp;klientovi</strong>';
      case 1: return '<strong class="bg-cyan">Ukončené&nbsp;na&nbsp;klientovi</strong>';
      case 2: return '<strong class="bg-cyan">Rozpracované&nbsp;na&nbsp;serveru</strong>';
      case 3: return '<strong class="bg-yellow">Připravené&nbsp;na&nbsp;archivaci</strong>';
      case 4: return '<strong>Archivované</strong>';
      case 5: return '<strong>Timeout&nbsp;analýzy&nbsp;média</strong>';
      case 6: return '<strong>Jiný&nbsp;problém&nbsp;s&nbsp;analýzou&nbsp;média</strong>';
    }
}

window.operateEventsArchive = {
    'click .edit-archive': function (e, value, row, index) {
        $('#edit-archive-modal').data('id', row._id).modal();
    },
    'click .remove-archive': function (e, value, row, index) {
        var r = confirm("Skutečne smazat archiv " + row._id + " ?");
        if (r === true) {
            var xhttp = new XMLHttpRequest();
            xhttp.open('GET', '/cdarcha/archivelist/del?id=' + row._id, true);

            // successful data submission
            xhttp.addEventListener('load', function(event) {
                $tableArchive.bootstrapTable('refresh')
            });

            // in case of error
            xhttp.addEventListener('error', function(event) {
              alert('Oops! Something went wrong.');
            });

            xhttp.send();
        }
    },
    'click .show-content': function (e, value, row, index) {
        var dataUrlMedia = $tableMedia.data('url').split('?'),
            dataUrlFiles = $treeviewFiles.data('url').split('?'),
            date = new Date(row.dtCreated);
            title = 'Obsah archivu',
            subtitle = 'Archivu s identifikátorem UUID ' + row.uuid + ' / vytvořeného ' + date.getDate() + '.' + (date.getMonth()+1) + '.' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes();

        $tableMedia.data('url', dataUrlMedia[0] + '?search=' + row._id);
        $treeviewFiles.data('url', dataUrlFiles[0] + '?search=' + row._id);
        initTableMedia($tableMedia);
        initTreeviewFiles($treeviewFiles);
        $('#tab-container').css('margin-left', '-200%');
        $('#btn-back2').data('title', $('h3').text()).data('subtitle', $('#subtitle').text());
        $('h3').text(title);
        $('#subtitle').text(subtitle);
        $('.menu-archive').removeClass('active');
        $('.menu-content').show().addClass('active');
    },
    'click .mount-archive': function (e, value, row, index) {
        var uuid = row.uuid;
        var xhttp = new XMLHttpRequest();
        xhttp.open('GET', '/cdarcha/archive/mount?uuid='+uuid, true);
        xhttp.send();
        $('#archive-pluged').toast({ delay: 3000 }).toast('show');
    },
    'click .unmount-archive': function (e, value, row, index) {
        var uuid = row.uuid;
        var xhttp = new XMLHttpRequest();
        xhttp.open('GET', '/cdarcha/archive/unmount', true);
        xhttp.send();
        $('#archive-unpluged').toast({ delay: 3000 }).toast('show');
    }
};


// ---------------------------------------
//   Common
// ---------------------------------------

function getHeight() {
    return $(window).height() - $('h1').outerHeight(true);
}

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

function boolFormatter(value, row, index) {
    if (value===undefined) return '';
    switch (value) {
        case 0: return 'Ne';
        case 1: return 'Ano';
    }
}

function sizeFormatter(value, row, index) {
    if (value===undefined) return '';
    value = value / 1000000;
    return value.toFixed(1) + ' MB';
}

function post(path, params, method) {
    method = method || "post"; // Set method to post by default if not specified.

    // The rest of this code assumes you are not using a library.
    // It can be made less wordy if you use one.
    var form = document.createElement("form");
    form.setAttribute("method", method);
    form.setAttribute("action", path);

    for(var key in params) {
        if(params.hasOwnProperty(key)) {
            var hiddenField = document.createElement("input");
            hiddenField.setAttribute("type", "hidden");
            hiddenField.setAttribute("name", key);
            hiddenField.setAttribute("value", params[key]);

            form.appendChild(hiddenField);
        }
    }

    document.body.appendChild(form);
    form.submit();
}

$(function () {
    var scripts = [
            location.search.substring(1) || 'assets/bootstrap-table/src/bootstrap-table.js',
            'assets/bootstrap-table/src/extensions/export/bootstrap-table-export.js'
        ];

    var eachSeries = function (arr, iterator, callback) {
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

    switch(location.pathname) {
        case '/cdarcha/bibliolist': eachSeries(scripts, getScript, initTableBiblio); break;
    }

    $('#edit-archive-modal').on('show.bs.modal', function (e) {
        var modal = $(this);
        $(this).find('.modal-body').load('/cdarcha/archivelist/edit/?id=' + modal.data('id'));
    });
    $('.save-archive').click(function(){
        var data = {
            '_id': $('#form-id').val(),
            '_csrf': $('#form-csrf').val(),
            'status': $('#archive-status').val()
        }
        var formDataArray = new Array();
        for(name in data) {
            formDataArray.push(name + '=' + encodeURI(data[name]));
        }

        var xhttp = new XMLHttpRequest();
        xhttp.open('POST', '/cdarcha/archivelist/edit', true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

        // successful data submission
        xhttp.addEventListener('load', function(event) {
            $('#edit-archive-modal').modal('hide');
            $tableArchive.bootstrapTable('refresh')
        });

        // in case of error
        xhttp.addEventListener('error', function(event) {
          alert('Oops! Something went wrong.');
        });

        xhttp.send(formDataArray.join('&'));
    });
});
