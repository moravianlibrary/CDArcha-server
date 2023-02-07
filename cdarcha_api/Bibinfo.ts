// ====================== BIBINFO.TS ===================

let metaCollection: string = "biblio";

export interface Bibdata {
    parent: string;
    ean13: string;
    issn: string;
    ismn: string;
    oclc: string;
    nbn: string;
    uuid: string;
    title: string;
    authors: string;
    year: string;
    part_type: string;
    part_year: string;
    part_volume: string;
    part_name: string;
    part_no: string;
    part_note: string;
    part_ean13: string;
    part_issn: string;
    part_ismn: string;
    part_oclc: string;
    part_nbn: string;
    part_title: string;
    part_authors: string;
    dtCreated: number;
    dtLastUpdate: number;
}

export class Bibinfo {
    parent: string;
    ean13: string;
    issn: string;
    ismn: string;
    oclc: string;
    nbn: string;
    uuid: string;
    title: string;
    authors: string;
    year: string;
    part_type: string;
    part_year: string;
    part_volume: string;
    part_name: string;
    part_no: string;
    part_note: string;
    part_ean13: string;
    part_issn: string;
    part_ismn: string;
    part_oclc: string;
    part_nbn: string;
    part_title: string;
    part_authors: string;
    dtCreated: number;
    dtLastUpdate: number;

    constructor(bibinfo: Bibdata) {
        this.parent = bibinfo.parent,
        this.ean13 = bibinfo.ean13,
        this.issn = bibinfo.issn,
        this.ismn = bibinfo.ismn,
        this.oclc = bibinfo.oclc,
        this.nbn = bibinfo.nbn,
        this.uuid = bibinfo.uuid,
        this.title = bibinfo.title,
        this.authors = bibinfo.authors,
        this.year = bibinfo.year,
        this.part_type = bibinfo.part_year,
        this.part_year = bibinfo.part_year,
        this.part_volume = bibinfo.part_volume,
        this.part_name = bibinfo.part_name,
        this.part_no = bibinfo.part_no,
        this.part_note = bibinfo.part_note,
        this.part_ean13 = bibinfo.part_ean13,
        this.part_issn = bibinfo.part_issn,
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
        var partType: string = null;
        if (bibinfo.part_type) {
            partType = bibinfo.part_type;
            if (bibinfo.part_ean13) bibinfo.ean13 = bibinfo.part_ean13;
            if (bibinfo.part_issn) bibinfo.issn = bibinfo.part_issn;
            if (bibinfo.part_ismn) bibinfo.ismn = bibinfo.part_ismn;
            if (bibinfo.part_nbn) bibinfo.nbn = bibinfo.part_nbn;
            if (bibinfo.part_oclc) bibinfo.oclc = bibinfo.part_oclc;
        }
        if (bibinfo.ean13) dbFind.push({ ean13: bibinfo.ean13 });
        if (bibinfo.issn) dbFind.push({ ean13: bibinfo.issn });
        if (bibinfo.ismn) dbFind.push({ ismn: bibinfo.ismn });
        if (bibinfo.nbn) dbFind.push({ nbn: bibinfo.nbn });
        if (bibinfo.oclc) dbFind.push({ oclc: bibinfo.oclc });
        if (bibinfo.uuid) dbFind.push({ uuid: bibinfo.uuid });

        if (!dbFind.length) {
          console.log('no biblio input to search for');
          callback(undefined);
          return;
        }
        
        var findQuery: any = { $or: dbFind };
        if (partType) {
            if (bibinfo.part_no && !bibinfo.part_year && !bibinfo.part_volume || !bibinfo.part_no) {
                console.log('part_no, part_year, part_volume missing');
                callback(undefined);
                return;
            }
            
            findQuery['part_type'] = partType;
            if (bibinfo.part_year) findQuery['part_year'] = bibinfo.part_year;
            if (bibinfo.part_volume) findQuery['part_volume'] = bibinfo.part_volume;
            if (bibinfo.part_no) findQuery['part_no'] = bibinfo.part_no;
            if (bibinfo.part_name) findQuery['part_name'] = bibinfo.part_name;
        }
        
        if (bibinfo.hasOwnProperty('login')) delete bibinfo['login'];
        if (bibinfo.hasOwnProperty('password')) delete bibinfo['password'];

        console.log('bibinfo:');
        console.dir(bibinfo);
        console.log('findQuery:');
        console.dir(findQuery);
        s.db.collection(metaCollection).find(findQuery).toArray(function(err, items) {
            if (items.length) {
                for (var i: number = 0; i < items.length; i++) {
                    var item = items[i];

                    // 0 = ean13
                    // 1 = nbn
                    // 2 = oclc
                    // 3 = ismn
                    // 4 = uuid
                    // 5 = issn
                    for (var j: number = 0; j <= 5; j++) {
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
                        else if (j==5 && bibinfo.issn && item.issn && bibinfo.issn == item.issn) {
                            console.log('found by ISSN');
                            callback(item);
                            return;
                        }
                    }
                }
            } else {
                console.log('biblio not found');
                console.dir(findQuery);
                callback(undefined);
            }
        });
    }

    static insert(s: any, bibinfo: Bibdata, callback) {
        Object.keys(bibinfo).forEach(function(key) {
            if (key!='ean13' && key!='nbn' && key!='oclc' && key!='ismn' && key!='uuid' && key!='issn' && key.slice(0,5)!='part_' && 
                key!='title' && key!='authors' && key!='year' && key!='dtCreated' && key!='dtLastUpdate')
            {
                delete bibinfo[key];
            }
        });

        bibinfo.dtCreated = bibinfo.dtLastUpdate = Date.now();

        s.db.collection(metaCollection).insertOne(bibinfo, { w: 1 }, function(err, result) {
            if (err) {
                console.log(err);
                callback(undefined);
            } else {
                
                // pokud se jedna o pediodikum / cast monografie
                if (bibinfo.part_type) {
                    
                    // zaznam periodika, nebo casti monografie
                    var bibinfoParent = Object.assign({}, bibinfo);
                    bibinfoParent['part_type'] = 'sz'; // souborny zaznam
                    delete bibinfoParent['_id'];
                    delete bibinfoParent['part_year'];
                    delete bibinfoParent['part_volume'];
                    delete bibinfoParent['part_no'];
                    delete bibinfoParent['part_name'];
                    delete bibinfoParent['part_note'];
                    Bibinfo.search(s, bibinfoParent, function(resSearch) {
                        if (!resSearch) {
                            
                            // souborny zaznam je potrebne zalozit
                            s.db.collection(metaCollection).insertOne(bibinfoParent, { w: 1 }, function(errParent, resultParent) {
                                s.db.collection(metaCollection).updateOne(
                                   { _id: result.insertedId },
                                   { $set: { parent: resultParent.insertedId } }
                               );
                               
                               callback(result);
                            });
                        }
                        else {
                            
                            s.db.collection(metaCollection).updateOne(
                               { _id: result.insertedId },
                               { $set: { parent: resSearch._id } }
                           );
                            
                            // souborny zaznam existuje, neni potreba zakladat
                            callback(result);
                        }
                    });
                
                }
                else {
                    callback(result);
                }
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
                        s.db.collection(metaCollection).findOne({_id: resInsert.insertedId}, function(err, insertedRec) {
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

}
