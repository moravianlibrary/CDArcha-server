// ====================== files.TS ===================

let filesCollection: string = "files";
let mediaCollection: string = "media";

const fs = require('fs');
import * as mongo from 'mongodb';
const storageFolder: string = "/mnt/cdarcha";

export interface Filesdata {
  archive: string;
  media: string;
  parent: string;
  fileName: string;
  fileType: string;
  checkSum: string;
  fileSize: number;
  dtCreated: number;
  dtLastUpdate: number;
}

export class Files {

    archive: string;
    media: string;
    parent: string;
    fileName: string;
    fileType: string;
    checkSum: string;
    fileSize: number;
    dtCreated: number;
    dtLastUpdate: number;

    constructor(files: Filesdata) {
        this.archive = files.archive;
        this.media = files.media;
        this.parent = files.parent;
        this.fileName = files.fileName;
        this.fileType = files.fileType;
        this.checkSum = files.checkSum;
        this.fileSize = files.fileSize;
        this.dtCreated = files.dtCreated;
        this.dtLastUpdate = files.dtLastUpdate;
    }

    static search(s: any, files: Filesdata, callback) {
       	if (!Files.checkInput(files)) return false;

        var searchQuery = { $or: [], fileType: files.fileType };
        if (files.archive) searchQuery.$or.push({ archive: files.archive });
        if (files.media) searchQuery.$or.push({ media: files.media });

        s.db.collection(filesCollection).find(searchQuery).toArray(function(err, items) {
            if (items.length) {
                callback(items);
                return;
            } else {
                console.log('file not found');
                console.dir(searchQuery);
                callback(undefined);
            }
        });
    }

    static insert(s: any, files: Filesdata, callback) {
        if (!Files.checkInput(files)) return false;

        Object.keys(files).forEach(function(key) {
            if (key!='archive' && key!='media' && key!='parent' && key!='fileName' && key!='fileType' && key!='checkSum' && key!='fileSize')
            {
                delete files[key];
            }
        });

        files.dtCreated = files.dtLastUpdate = Date.now();

        s.db.collection(filesCollection).insertOne(files, { w: 1 }, function(err, result) {
            if (err) {
                console.log(err);
                callback(undefined);
            } else {
                callback(result);
            }
        });
    }

    static insertUnique(s: any, files: Filesdata, callback) {
        if (!Files.checkInput(files)) return false;

        var searchQuery = { $or: [], fileType: files.fileType };
        if (files.archive) searchQuery.$or.push({ archive: files.archive });
        if (files.media) searchQuery.$or.push({ media: files.media });

        s.db.collection(filesCollection).find(searchQuery).toArray(function(err, docs) {
            if (err) {
                console.dir(err);
                callback(undefined);
            } else {
                for (var i=0; i<=docs.length-1; i++) {
                    (function(doc) {
                        // files subdir
                        var fileSubdir: string;
                        switch (doc.fileType) {
                            case 'cover': fileSubdir = 'mastercopy'; break;
                            case 'toc': fileSubdir = 'mastercopy'; break;
                            default: fileSubdir = '';
                        }
                        // remove old files and remove DB records
                        if (doc.archive) {
                            const filenameFull = storageFolder + '/' + doc.archive + '/' + fileSubdir + '/' + doc.fileName;
                            if (fs.existsSync(filenameFull)){
                                fs.unlinkSync(filenameFull);
                            }
                            s.db.collection(filesCollection).deleteOne({ _id: new mongo.ObjectID(doc._id) });
                        } else {
                            s.db.collection(mediaCollection).findOne({ _id: new mongo.ObjectID(doc.media) }, { w: 1 }, function(err, mediaDoc) {
                                const filenameFull = storageFolder + '/' + mediaDoc.archive + '/' + fileSubdir + '/' + doc.fileName;
                                if (fs.existsSync(filenameFull)){
                                    fs.unlinkSync(filenameFull);
                                }
                                s.db.collection(filesCollection).deleteOne({ _id: new mongo.ObjectID(doc._id) });
                            });
                        }
                    }(docs[i]));
                }

                // insert new file record
                Files.insert(s, files, function(resInsert) {
                    if (!resInsert) {
                        var err = 'Files insert failed';
                        console.log(err);
                        callback(undefined);
                    } else {
                        s.db.collection(filesCollection).findOne({_id: resInsert.insertedId}, function(err, insertedRec) {
                            if (err) callback(undefined);
                            callback(insertedRec);
                        });
                    }
                });
            }
        });
    }

    static searchAndCreate(s: any, files: Filesdata, callback) {
        if (!Files.checkInput(files)) return false;

        Files.search(s, files, function(resSearch) {
            if (!resSearch) {
                Files.insert(s, files, function(resInsert) {
                    if (!resInsert) {
                        var err = 'Filesinfo insert failed';
                        console.log(err);
                        callback(undefined);
                    } else {
                        s.db.collection(filesCollection).findOne({_id: resInsert.insertedId}, function(err, insertedRec) {
                            if (err) callback(undefined);
                            callback(insertedRec);
                        });
                    }
                });
            }
            else {
                callback(resSearch);
            }
        });
    }

    static checkInput(files: Filesdata) {
        if (!files.archive && !files.media) {
            console.log('Archive, or media id are mandatory');
            return false;
        }
        if (!files.fileType) {
            console.log('File type is mandatory');
            return false;
        }
        return true;
    }

}
