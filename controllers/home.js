const Archive = require('../models/Archive');
const Biblio = require('../models/Biblio');
const { exec } = require("child_process");

/**
 * GET /
 * Home page.
 */
exports.index = (req, res) => {
  if (!req.user) {
    return res.redirect(301, '/cdarcha/login')
  }

  Archive.aggregate([ {"$group" : {_id:"$status", count:{ $sum: 1 }}} ]).exec((err, rows) => {
    if (err) { res.json({ total: 0, rows: [], errmsg: err.errmsg} ); return; }

    let sums = { 'st0':0, 'st1':0, 'st2':0, 'st3':0, 'st4':0, 'st5':0, 'st6':0 };
    for (let i=0; i<rows.length; i++) {
        let item = rows[i];
        sums['st'+item._id] = item.count;
    }

    let df = { total:0, free:0, percent:0 };
    exec("df -h " + process.env.STORAGE_DIR, (error, stdout, stderr) => {
        if (!error && !stderr) {
            stdout = stdout.replace(/\s\s/g, ' ').replace(/\s\s/g, ' ').replace(/\s\s/g, ' ');
            let dfArr = stdout.split(' ');
            let dfPercent = dfArr[10];
            df = { total:dfArr[7], free:dfArr[9], percent:dfPercent.slice(0,-1) };

            exec("uptime | awk -F'load average: ' '{ print $2 }'", (error, stdout, stderr) => {
                if (!error && !stderr) {
                    const cpuCores = process.env.CPU_CORES;
                    const sysLoad = stdout;
                    const sysLoadSplit = sysLoad.split(',');
                    const sysLoadActual = sysLoadSplit[0];
                    const sysLoadActualPercent = sysLoadActual / (cpuCores / 100);

                    res.render('home/list', {
                        title: 'Souhrn',
                        sums: sums,
                        df: df,
                        cpu: Math.ceil(sysLoadActualPercent)
                    });
                }
            });
        }
    });
  });
};

/**
 * GET /home/dataset
 * List of archive records for bootstrap table
 */
exports.getListDataset = (req, res) => {
  var searchQuery = {};

  var orderField = 'dtLastUpdate',
      orderDirection = '-1',
      limit = parseInt(req.query.limit) || 10,
      offset = parseInt(req.query.offset) || 0;

  Archive.find(searchQuery).sort( [[orderField,orderDirection]] ).limit(limit).skip(offset).exec((err, archive) => {
    if (err) { res.json({ total: 0, rows: [], errmsg: err.errmsg} ); return; }
    Archive.count(searchQuery).exec((err, count) => {
      if (err) { res.json({ total: 0, rows: [], errmsg: err.errmsg} ); return; }

      (async function() {
        for (var i=0; i<archive.length; i++) {
          var archItem = archive[i];
          const resBib = await Biblio.findById(archItem.biblio).exec();
          archItem['_doc']['uuidTitle'] = '<strong>' + archItem.uuid + '</strong><br/><span style="font-size:small;"><i>' + resBib.authors + '</i><br/><u>' + resBib.title + '</u><br/>' + (resBib.ean13?'ISBN: '+resBib.ean13:'') + ' ' + (resBib.nbn?'ČNB: '+resBib.nbn:'') + '</span>';
        };

        var out = {
          total: count,
          rows: archive
        }
        res.json(out);
      })();
    });
  });
};
