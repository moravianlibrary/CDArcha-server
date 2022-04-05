"use strict";
// ====================== Media.TS ===================
exports.__esModule = true;
exports.Media = void 0;
var mediaCollection = "media";
var Media = /** @class */ (function () {
    function Media(media) {
        this.archive = media.archive;
        this.mediaNo = media.mediaNo;
        this.fileType = media.fileType;
        this.checkSum = media.checkSum;
        this.quickId = media.quickId;
        this.mediaSize = media.mediaSize;
        this.mediaReadProblem = media.mediaReadProblem;
        this.forcedUpload = media.forcedUpload;
        this.dtCreated = media.dtCreated;
        this.dtLastUpdate = media.dtLastUpdate;
    }
    Media.search = function (s, media, callback) {
        if (!media.archive || !media.mediaNo)
            return;
        s.db.collection(mediaCollection).find({ archive: media.archive, mediaNo: media.mediaNo }).toArray(function (err, items) {
            if (items.length) {
                callback(items);
                return;
            }
            else {
                console.log('media not found');
                console.dir({ archive: media.archive, mediaNo: media.mediaNo });
                callback(undefined);
            }
        });
    };
    Media.insert = function (s, media, callback) {
        Object.keys(media).forEach(function (key) {
            if (key != 'archive' && key != 'mediaNo') {
                delete media[key];
            }
        });
        if (!media.archive || !media.mediaNo) {
            console.log('Archive id and mediaNo are mandotory');
            return;
        }
        media.dtCreated = media.dtLastUpdate = Date.now();
        s.db.collection(mediaCollection).insertOne(media, { w: 1 }, function (err, result) {
            if (err) {
                console.log(err);
                callback(undefined);
            }
            else {
                callback(result);
            }
        });
    };
    Media.searchAndCreate = function (s, media, callback) {
        Media.search(s, media, function (resSearch) {
            if (!resSearch) {
                Media.insert(s, media, function (resInsert) {
                    if (!resInsert) {
                        var err = 'Media insert failed';
                        console.log(err);
                        callback(undefined);
                    }
                    else {
                        s.db.collection(mediaCollection).findOne({ _id: resInsert.insertedId }, function (err, insertedRec) {
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
    return Media;
}());
exports.Media = Media;
