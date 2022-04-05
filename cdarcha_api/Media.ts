// ====================== Media.TS ===================

let mediaCollection: string = "media";

export interface Mediadata {
	archive: string;
	mediaNo: string;
  fileType: string;
	checkSum: string;
  quickId: string;
  mediaSize: number;
  mediaReadProblem: number;
  forcedUpload: number;
	dtCreated: number;
	dtLastUpdate: number;
}

export class Media {

		archive: string;
		mediaNo: string;
		fileType: string;
		checkSum: string;
		quickId: string;
		mediaSize: number;
		mediaReadProblem: number;
		forcedUpload: number;
		dtCreated: number;
		dtLastUpdate: number;

    constructor(media: Mediadata) {
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

    static search(s: any, media: Mediadata, callback) {
       	if (!media.archive || !media.mediaNo) return;
        s.db.collection(mediaCollection).find({ archive: media.archive, mediaNo: media.mediaNo }).toArray(function(err, items) {
            if (items.length) {
                callback(items);
                return;
            } else {
                console.log('media not found');
                console.dir({ archive: media.archive, mediaNo: media.mediaNo });
                callback(undefined);
            }
        });
    }

    static insert(s: any, media: Mediadata, callback) {
        Object.keys(media).forEach(function(key) {
            if (key!='archive' && key!='mediaNo')
            {
                delete media[key];
            }
        });
        if (!media.archive || !media.mediaNo) {
            console.log('Archive id and mediaNo are mandotory');
			return;
        }

        media.dtCreated = media.dtLastUpdate = Date.now();

        s.db.collection(mediaCollection).insertOne(media, { w: 1 }, function(err, result) {
            if (err) {
                console.log(err);
                callback(undefined);
            } else {
                callback(result);
            }
        });
    }

	static searchAndCreate(s: any, media: Mediadata, callback) {
        Media.search(s, media, function(resSearch) {
            if (!resSearch) {
                Media.insert(s, media, function(resInsert) {
                    if (!resInsert) {
                        var err = 'Media insert failed';
                        console.log(err);
                        callback(undefined);
                    } else {
                        s.db.collection(mediaCollection).findOne({_id: resInsert.insertedId}, function(err, insertedRec) {
                            if (err) callback(undefined);
                            callback(insertedRec);
                        });
                    }
                });
            }
            else {
                callback(resSearch[0]);
            }
        });
    }

}
