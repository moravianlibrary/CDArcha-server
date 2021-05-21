const { promisify } = require('util');
const Archive = require('../models/Archive');
const Media = require('../models/Media');
const Files = require('../models/Files');
const Biblio = require('../models/Biblio');
const path = require('path');
const rimraf = require('rimraf');
const fs = require('fs');

/**
 * GET /archivelist
 * List of archive.
 */
exports.getList = (req, res) => {
  if (!req.user) {
    return res.redirect('/cdarcha/login');
  }
  res.render('archive/list', {
    title: 'Archiv médií'
  });
};

/**
 * GET /archivelist/dataset
 * List of all archive records for bootstrap table
 */
exports.getListDataset = (req, res) => {
  var searchQuery = {};

  // searching for something
  if (req.query.search && req.query.search.length) {
    var searchPhrase = req.query.search,
        searchStatus = undefined;

    if (Array.isArray(searchPhrase)) {
      searchStatus = searchPhrase[0];
      searchPhrase = searchPhrase[1];
    }

    if (searchPhrase!='') {
      if (searchPhrase.length == 24) {
        searchQuery = {
          $or: [
            { '_id': searchPhrase },
            { 'biblio': searchPhrase }
          ]
        };
      } else {
        searchQuery = {
          $or: [
            { 'uuid': new RegExp(searchPhrase) }
          ]
        };
      }
    }

    if (searchStatus) {
      switch (searchStatus) {
        case 's0': searchQuery.status = 0; break;
        case 's1': searchQuery.status = 1; break;
        case 's2': searchQuery.status = 2; break;
        case 's3': searchQuery.status = 3; break;
        case 's4': searchQuery.status = 4; break;
      }
    }
  }

  var orderField = req.query.sort || 'title',
      orderDirection = (req.query.order=='desc' ? '-1' : '1'),
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

/**
 * GET /archivelist/edit
 * Archive edit form.
 */
exports.getEditForm = (req, res) => {
  var id = req.query.id;
  if (!req.user || !id || !id.length) {
    return res.redirect('/cdarcha/login');
  }

  Archive.find({ _id: id}, (err, archive) => {
    if (err) { return next(err); }
    res.render('archive/edit', {
      'data': archive[0]
    });
  });
};

/**
 * POST /archivelist/edit
 * Archive edit form.
 */
exports.postEditForm = (req, res) => {
  var id = req.body._id;

  if (!req.user || !id || !id.length) {
    return res.redirect('/cdarcha/login');
  }

  Archive.findById(id, (err, archive) => {
    if (err) { return next(err); }
    archive.status = req.body.status || '';
    archive.save((err) => {
      if (err) {
        //req.flash('errors', { msg: 'Změny záznamu archivu se nepovedlo uložit.' });
        return next(err);
      }
      //req.flash('success', { msg: 'Změny záznamu archivu uloženy.' });
      res.json({ 'message': 'ok' });
    });
  });
};

/**
 * GET /archivelist/del
 * Delete whole archive content in DB and filesystem.
 */
exports.delArchive = (req, res) => {
  var id = req.query.id;

  if (!req.user || !id || !id.length) {
    return res.redirect('/cdarcha/login');
  }

  Archive.findById(id, (err, archive) => {
    if (err) { return next(err); }

    // remove all files from filesystem
    rimraf(path.join(process.env.STORAGE_DIR, id), function(err){
      if (err) {
        console.dir(err);
        res.status(404).send('{\'message\': \'' + err.code + '\' }');
        return next(err);
      }

      // remove media from DB
      Media.remove({ archive: id }, (err) => {
        if (err) {
          console.dir(err);
          res.status(404).send('{\'message\': \'Failed to remove media from DB\' }');
          return next(err);
        }

        // remove files from DB
        Files.remove({ archive: id }, (err) => {
          if (err) {
            console.dir(err);
            res.status(404).send('{\'message\': \'Failed to remove files from DB\' }');
            return next(err);
          }

          // remove archive from DB
          Archive.remove({ _id: id }, (err) => {
            if (err) {
              console.dir(err);
              res.status(404).send('{\'message\': \'Failed to remove archive from DB\' }');
              return next(err);
            }

            res.json({ 'message': 'ok' });
          });
        });
      });
    });
  });
};


/**
 * GET /cdarcha/archive/mount
 * Mount archive with UUID specified
 */
exports.mountArchive = (req, res) => {
  if (req.user && req.query.uuid) {
    const shareDir = process.env.STORAGE_DIR + '/share/' + req.user._doc.shareDir;
    const uuid = req.query.uuid;
    fs.symlink(process.env.STORAGE_DIR + '/' + uuid, shareDir+'/'+uuid, function(){});
  }
  res.json({'message': 'ok' });
};


/**
 * GET /cdarcha/archive/unmount
 * Mount archive with UUID specified
 */
exports.unmountArchive = (req, res) => {
  if (req.user) {
    const shareDir = process.env.STORAGE_DIR + '/share/' + req.user._doc.shareDir + '/*';
    rimraf(shareDir, function(err){
        if (err) {
          console.dir(err);
          res.status(404).send('{\'message\': \'' + err.code + '\' }');
          return;
        }
    });
  }
  res.json({'message': 'ok' });
};
