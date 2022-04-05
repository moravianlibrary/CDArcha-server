// ====================== Archive.TS ===================

const { v1: uuidv1 } = require('uuid');

let archiveCollection: string = "archive";

export interface Archivedata {
    uuid: string;
    biblio: string;
    creator: string;
    status: number;
    dtCreated: number;
    dtLastUpdate: number;
}

export class Archive {

    uuid: string;
    biblio: string;
    creator: string;
    status: number;
    dtCreated: number;
    dtLastUpdate: number;

    constructor(archive: Archivedata) {
        this.uuid = uuidv1();
        this.biblio = archive.biblio;
		    this.status = archive.status;
        this.creator = archive.creator;
        this.dtCreated = archive.dtCreated;
        this.dtLastUpdate = archive.dtLastUpdate;
    }

    static searchById(s: any, id: string): any {
       	if (!id) return;
        s.db.collection(archiveCollection).findOne({ _id: id }, function(err, item) {
            return item;
        });
    }

    static searchOpen(s: any, archive: Archivedata, callback) {
       	if (!archive.biblio) return;
        s.db.collection(archiveCollection).find({ biblio: archive.biblio, status: 0 }).toArray(function(err, items) {
            if (items.length) {
                callback(items);
                return;
            } else {
                console.log('archive not found');
                console.dir({ biblio: archive.biblio, status: 0 });
                callback(undefined);
            }
        });
    }

    static insert(s: any, archive: Archivedata, callback) {
        Object.keys(archive).forEach(function(key) {
            if (key!='biblio' && key!='status' && key!='creator')
            {
                delete archive[key];
            }
        });
				if (!archive.biblio) return;

        archive.status = 0;
        archive.uuid = uuidv1();
        archive.dtCreated = archive.dtLastUpdate = Date.now();

        s.db.collection(archiveCollection).insertOne(archive, { w: 1 }, function(err, result) {
            if (err) {
                console.log(err);
                callback(undefined);
            } else {
                callback(result);
            }
        });
    }

	static searchOpenAndCreate(s: any, archive: Archivedata, callback) {
        Archive.searchOpen(s, archive, function(resSearch) {
            if (!resSearch) {
                Archive.insert(s, archive, function(resInsert) {
                    if (!resInsert) {
                        var err = 'Archive insert failed';
                        console.log(err);
                        callback(undefined);
                    } else {
                        s.db.collection(archiveCollection).findOne({_id: resInsert.insertedId}, function(err, insertedRec) {
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
