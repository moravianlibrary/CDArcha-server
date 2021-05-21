$(function () {
  var scripts = [
          location.search.substring(1) || 'assets/bootstrap-table/src/bootstrap-table.js',
          'assets/bootstrap-table/src/extensions/export/bootstrap-table-export.js'
      ];

  var hash = window.location.hash;
  if (hash.length) {
    hash = hash.substring(1, hash.length);
    $('#toolbar-tab2 .search input').val(hash);
  }

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

  eachSeries(scripts, getScript, initTableArchive);

  $('#btn-filter0').click(function(){
      filterStatus('s0');
  });

  $('#btn-filter1').click(function(){
      filterStatus('s1');
  });

  $('#btn-filter2').click(function(){
      filterStatus('s2');
  });

  $('#btn-filter3').click(function(){
      filterStatus('s3');
  });

  $('#btn-filter4').click(function(){
      filterStatus('s4');
  });

  $('#btn-filter5').click(function(){
      filterStatus('s5');
  });

  $('#btn-filter6').click(function(){
      filterStatus('s6');
  });

  $('#btn-filternone').click(function(){
      filterStatus('');
  });
});

function filterStatus(status) {
  var dataUrl = $tableArchive.data('url').split('?');
  $tableArchive.bootstrapTable('destroy');
  $tableArchive.data('url', dataUrl[0] + (status!='' ? '?search=' + status : ''));
  initTableArchive($tableArchive);
}
