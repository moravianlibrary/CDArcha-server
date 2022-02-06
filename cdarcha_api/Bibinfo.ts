// ====================== BIBINFO.TS ===================

let metaCollection: string = "biblio";

export interface Bibdata {
    ean13: string;
    ismn: string;
    oclc: string;
    nbn: string;
    uuid: string;
    title: string;
    authors: string;
    year: string;
    part_year: string;
    part_year_orig: string;
    part_volume: string;
    part_volume_orig: string;
    part_name: string;
    part_name_orig: string;
    part_no: string;
    part_no_orig: string;
    part_note: string;
    part_note_orig: string;
    part_ean13: string;
    part_ismn: string;
    part_oclc: string;
    part_nbn: string;
    part_title: string;
    part_authors: string;
    dtCreated: number;
    dtLastUpdate: number;
}

export class Bibinfo {

    ean13: string;
    ismn: string;
    oclc: string;
    nbn: string;
    uuid: string;
    title: string;
    authors: string;
    year: string;
    part_year: string;
    part_year_orig: string;
    part_volume: string;
    part_volume_orig: string;
    part_name: string;
    part_name_orig: string;
    part_no: string;
    part_no_orig: string;
    part_note: string;
    part_note_orig: string;
    part_ean13: string;
    part_ismn: string;
    part_oclc: string;
    part_nbn: string;
    part_title: string;
    part_authors: string;
    dtCreated: number;
    dtLastUpdate: number;

    constructor(bibinfo: Bibdata) {
        this.ean13 = bibinfo.ean13,
        this.ismn = bibinfo.ismn,
        this.oclc = bibinfo.oclc,
        this.nbn = bibinfo.nbn,
        this.uuid = bibinfo.uuid,
        this.title = bibinfo.title,
        this.authors = bibinfo.authors,
        this.year = bibinfo.year,
        this.part_year = bibinfo.part_year,
        this.part_year_orig = bibinfo.part_year_orig,
        this.part_volume = bibinfo.part_volume,
        this.part_volume_orig = bibinfo.part_volume_orig,
        this.part_name = bibinfo.part_name,
        this.part_name_orig = bibinfo.part_name_orig,
        this.part_no = bibinfo.part_no,
        this.part_no_orig = bibinfo.part_no_orig,
        this.part_note = bibinfo.part_note,
        this.part_note_orig = bibinfo.part_note_orig,
        this.part_ean13 = bibinfo.part_ean13,
        this.part_ismn = bibinfo.part_ismn,
        this.part_oclc = bibinfo.part_oclc,
        this.part_nbn = bibinfo.part_nbn,
        this.part_title = bibinfo.part_title,
        this.part_authors = bibinfo.part_authors,
        this.dtCreated = bibinfo.dtCreated,
        this.dtLastUpdate = bibinfo.dtLastUpdate;
    }

    static search(s: any, bibinfo: Bibdata, callback) {
        var dbFind = [];
        if (bibinfo.part_ean13) bibinfo.ean13 = bibinfo.part_ean13;
        if (bibinfo.part_nbn) bibinfo.nbn = bibinfo.part_nbn;
        if (bibinfo.part_oclc) bibinfo.oclc = bibinfo.part_oclc;
        if (bibinfo.part_ismn) bibinfo.ismn = bibinfo.part_ismn;
        if (bibinfo.ean13) dbFind.push({ ean13: bibinfo.ean13 });
        if (bibinfo.nbn) dbFind.push({ nbn: bibinfo.nbn });
        if (bibinfo.oclc) dbFind.push({ oclc: bibinfo.oclc });
        if (bibinfo.ismn) dbFind.push({ ismn: bibinfo.ismn });
        if (bibinfo.uuid) dbFind.push({ uuid: bibinfo.uuid });

        if (!dbFind.length) {
          console.log('no biblio input to search for');
          callback(undefined);
          return;
        }

        s.db.collection(metaCollection).find({ $or: dbFind }).toArray(function(err, items) {
            if (items.length) {
                for (var i: number = 0; i < items.length; i++) {
                    var item = items[i];

                    // 0 = ean13
                    // 1 = nbn
                    // 2 = oclc
                    // 3 = ismn
                    // 4 = uuid
                    for (var j: number = 0; j <= 4; j++) {
                        if (j==0 && bibinfo.ean13 && item.ean13 && bibinfo.ean13 == item.ean13) {
                            console.log('found by EAN13');
                            callback(item);
                            return;
                        }
                        else if (j==1 && bibinfo.nbn && item.nbn && bibinfo.nbn == item.nbn) {
                            console.log('found by NBN');
                            callback(item);
                            return;
                        }
                        else if (j==2 && bibinfo.oclc && item.oclc && bibinfo.oclc == item.oclc) {
                            console.log('found by OCLC');
                            callback(item);
                            return;
                        }
                        else if (j==3 && bibinfo.ismn && item.ismn && bibinfo.ismn == item.ismn) {
                            console.log('found by ISMN');
                            callback(item);
                            return;
                        }
                        else if (j==4 && bibinfo.uuid && item.uuid && bibinfo.uuid == item.uuid) {
                            console.log('found by UUID');
                            callback(item);
                            return;
                        }
                    }
                }
            } else {
                console.log('not found');
                callback(undefined);
            }
        });
    }

    static insert(s: any, bibinfo: Bibdata, callback) {
        Object.keys(bibinfo).forEach(function(key) {
            if (key!='ean13' && key!='nbn' && key!='oclc' && key!='ismn' && key!='uuid' &&
                key!='title' && key!='authors' && key!='year' && key!='dtCreated' && key!='dtLastUpdate')
            {
                delete bibinfo[key];
            }
        });

        bibinfo.dtCreated = bibinfo.dtLastUpdate = Date.now();

        s.db.collection(metaCollection).insert(bibinfo, { w: 1 }, function(err, result) {
            if (err) {
                console.log(err);
                callback(undefined);
            } else {
                callback(result);
            }
        });
    }

    static searchAndCreate(s: any, bibinfo: Bibdata, callback) {
        Bibinfo.search(s, bibinfo, function(resSearch) {
            if (!resSearch) {
                Bibinfo.insert(s, bibinfo, function(resInsert) {
                    if (!resInsert) {
                        var err = 'Bibinfo insert failed';
                        console.log(err);
                        callback(undefined);
                    } else {
                        callback(resInsert.ops[0]);
                    }
                });
            }
            else {
                callback(resSearch);
            }
        });
    }

}
