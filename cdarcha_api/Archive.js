"use strict";
// ====================== Archive.TS ===================
exports.__esModule = true;
exports.Archive = void 0;
var uuidv1 = require('uuid').v1;
var archiveCollection = "archive";
var Archive = /** @class */ (function () {
    function Archive(archive) {
        this.uuid = uuidv1();
        this.biblio = archive.biblio;
        this.status = archive.status;
        this.creator = archive.creator;
        this.dtCreated = archive.dtCreated;
        this.dtLastUpdate = archive.dtLastUpdate;
    }
    Archive.searchById = function (s, id) {
        if (!id)
            return;
        s.db.collection(archiveCollection).findOne({ _id: id }, function (err, item) {
            return item;
        });
    };
    Archive.searchOpen = function (s, archive, callback) {
        if (!archive.biblio)
            return;
        s.db.collection(archiveCollection).find({ biblio: archive.biblio, status: 0 }).toArray(function (err, items) {
            if (items.length) {
                callback(items);
                return;
            }
            else {
                console.log('archive not found');
                console.dir({ biblio: archive.biblio, status: 0 });
                callback(undefined);
            }
        });
    };
    Archive.insert = function (s, archive, callback) {
        Object.keys(archive).forEach(function (key) {
            if (key != 'biblio' && key != 'status' && key != 'creator') {
                delete archive[key];
            }
        });
        if (!archive.biblio)
            return;
        archive.status = 0;
        archive.uuid = uuidv1();
        archive.dtCreated = archive.dtLastUpdate = Date.now();
        s.db.collection(archiveCollection).insertOne(archive, { w: 1 }, function (err, result) {
            if (err) {
                console.log(err);
                callback(undefined);
            }
            else {
                callback(result);
            }
        });
    };
    Archive.searchOpenAndCreate = function (s, archive, callback) {
        Archive.searchOpen(s, archive, function (resSearch) {
            if (!resSearch) {
                Archive.insert(s, archive, function (resInsert) {
                    if (!resInsert) {
                        var err = 'Archive insert failed';
                        console.log(err);
                        callback(undefined);
                    }
                    else {
                        s.db.collection(archiveCollection).findOne({ _id: resInsert.insertedId }, function (err, insertedRec) {
                            if (err)
                                callback(undefined);
                            callback(insertedRec);
                        });
                    }
                });
            }
            else {
                callback(resSearch[0]);
            }
        });
    };
    return Archive;
}());
exports.Archive = Archive;
