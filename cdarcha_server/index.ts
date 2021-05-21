// @ts-ignore

// ====================== CONFIG.TS ===================
const apiVersion: string = "1.0";

// nacteni konfigurace
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

// url na backend
const urlMain: string = process.env.BASE_DOMAIN

const urlPart: string = "/"
const apiImport: string = "api/import"
const urlUpload: string = "file/upload"
const urlCoverUpload: string = "file/coverupload"
const apiChecksum: string = "api/gethash"
const apiGetMedia: string = "api/getmedia"
const apiGetAllMediaList: string = "api/getallmedialist"
const apiCloseArchive: string = "api/closearchive"
const urlMetadata: string = "api/media"
const urlWeb: string = "cdarcha"
const urlParams: string = "?books="
const urlStorage: string = "storage/"
const uriAlive: string = "runtime/alive"
// kolekce s metadaty tak jak je pojmenovana v mongodb
const metaCollection: string = "biblio"
const archiveCollection: string = "archive"
const mediaCollection: string = "media"
const filesCollection: string = "files"
const usersCollection: string = "users"
// temporary files
//const tmpFolder: string = "/home/cdarcha/cdarcha/tmp";
const tmpFolder: string = process.env.TMP_DIR;
const storageFolder: string = process.env.STORAGE_DIR;

// =========================================

const request = require('request');
const toEan = require('./to-ean').toEan;
const partParser = require('./book-part-parser');
const URL_lib = require('url');
const fs = require('fs');
const md5 = require('md5');
const http = require('http');
const mongo = require('mongodb');
const crypto = require('crypto');
const httpProxy = require('http-proxy');
const multipart = require('parse-multipart');
const xmlFormatter = require('xml-formatter');

const proxy: any = httpProxy.createProxyServer();

var etags: any = {}; // obsahuje vsechny platne etag pro cache prohlizec


import { Bibinfo, Bibdata } from "./Bibinfo";
import { Archive, Archivedata } from "./Archive";
import { Media, Mediadata } from "./Media";
import { Files, Filesdata } from "./Files";
import { Statistics } from "./Statistics";
import { Permissions } from "./Permissions";
import { Helpers } from "./Helpers";

const statusHuman = {
    0: 'Rozpracované na klientovi',
    1: 'Ukončené na klientovi',
    2: 'Rozpracované na serveru',
    3: 'připravené na archivaci',
    4: 'Archivované',
    5: 'Timeout analýzy média (DROID)',
    6: 'Jiný problém s analýzou média (DROID)'
}

const subdirByPrefix = {
    'amd': 'amdsec/',
    'dmd': 'dmdsec/',
    'mcs': 'mastercopyscan/',
    'ucs': 'usercopyscan/'
}


// ====================== CD ARCHA API ===================

var server = function(req, response, db) {
    var a = new Server(req, response, db);
    a.go(a);
}

interface Result {
    bib: any;
    sel: any;
}

interface ItemInfo {
    item: any;
    ean13: any;
    nbn: any;
    ismn: any;
    oclc: any;
    part_year: any;
    part_volume: any;
    part_no: any;
    part_name: any;
    part_root: any;
    part_ean13_standalone: any;
    part_nbn_standalone: any;
    part_ismn_standalone: any;
    part_oclc_standalone: any;
}

class Server {
    req: any;
    response: any;
    db: any;

    requrl: any;
    query: any;
    date: any;
    timestamp: any;
    now: any;
    etag: any;
    referer: any;
    remoteIP: any;
    encsigla: any;

    sigla: any; //pridane-------------------------------------------------------------------------------------

    static placeholderData: any = [
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x0A, 0x00, 0x01, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x4C, 0x01, 0x00, 0x3B
    ];
    static placeholder: any = Buffer.from(Server.placeholderData);

    constructor(req: any, response: any, db: any) {
        this.requrl = req.url;
        testLog("33", "CD ARCHA v"+apiVersion+" starting...");
        testLog("92", "Request url:" + this.requrl);
        // console.log(req.connection.remoteAddress);
        // console.log(requrl);
        this.query = URL_lib.parse(this.requrl, true).query;
        // console.log('query: ' + JSON.stringify(query));
        this.date = new Date();
        this.timestamp = this.date.toISOString();
        this.now = this.date.getTime();
        // console.log(timestamp);
        // console.log('HEAENCRYPTD: ' + JSON.stringify(req.headers));
        this.etag = req.headers['if-none-match'] || req.headers['Etag'];
        this.referer = req.headers['referer'];
        this.remoteIP = req.connection.remoteAddress;
        this.encsigla = this.query.encsigla;
        // console.log(etags);
        // console.log('index: ' + requrl.indexOf(urlMetadata));
        this.req = req;
        this.response = response;
        this.db = db;

        this.sigla = Permissions.refererValid(this.referer, this.remoteIP, this.encsigla);
    }


    go(s: Server) {
        /**
         * ETAG MATCH
         **/
        if (this.requrl == '/') {
          this.response.writeHead(301, {
            'Location': process.env.BASE_URL
          });
          this.response.end();
        }

        /**
         * ETAG MATCH
         **/
        if (etags[this.etag] !== undefined) {

            testLog("44", "[ETAG MATCH]");

            var sigla: any = Permissions.refererValid(this.referer, this.remoteIP, this.encsigla);
            var etagPrefix: any = this.etag.substring(0, 4);

            Statistics.addEtagStatisticByEtagPrefix(etagPrefix, sigla);

            this.response.statusCode = 304;
            this.response.end();
        }

        /**
         * STATICKE SOUBORY
         **/
        // http://cdarcha.mzk.cz/favicon.ico
        else if (this.requrl === '/favicon.ico' || this.requrl === '/cdarcha_klient/update-info.xml' || this.requrl === '/cdarcha_klient/CDArcha_klient_setup.exe' || this.requrl === '/cdarcha_klient/CDArcha_klient_setupNoAdmin.exe')
        {
            testLog("41", "[STATICKE SUBORY] Sigla:" + sigla);

            Statistics.addFileRequests(sigla);
            testLog("41", "-> fileRequests[sigla]:" + Statistics.fileRequests[sigla]);

            if (this.requrl.substring(this.requrl.length - 4) === '.ico')
                this.response.writeHead(200, { 'Etag': 'file-' + md5(this.requrl), 'Content-Type': 'image/x-icon' });
            if (this.requrl.substring(this.requrl.length - 2) === '.js')
                this.response.writeHead(200, { 'Etag': 'file-' + md5(this.requrl), 'Content-Type': 'text/javascript' });
            else
                this.response.writeHead(200, { 'Etag': 'file-' + md5(this.requrl) });

            etags['file-' + md5(this.requrl)] = null;
            var readStream: any = fs.createReadStream('static' + this.requrl);
            readStream.pipe(this.response);
        }

        /**
         * LET'S ENCRYPT CHALLENGE
         **/
        else if (this.requrl.substr(0,12) === '/.well-known') {
            testLog("41", "[LETS ENCRYPT]");

            var fileName: any = this.requrl.substr(13);
            if (fs.existsSync(fileName)) {
                var readStream: any = fs.createReadStream(fileName);
                readStream.pipe(this.response);
            } else {
                s.send404IfNotValue(false);
            }
        }


        /**
         * WEB
         **/
        else if (this.requrl.indexOf(urlWeb) > 0) {
          if (!this.req.connection.encrypted) {
            this.response.writeHead(301, {
              'Location': process.env.BASE_URL + '/' + this.requrl
            });
            this.response.end();
          }
          proxy.web(this.req, this.response, {
            target: process.env.BASE_URL_INTERNAL + '/'
          });
        }


        /**
         * API IMPORT
         **/
        else if (this.requrl.indexOf(apiImport) > 0) {
            testLog("41", "[ API IMPORT ]");

            if (this.req.method == 'POST') {
                testLog("41", "POST");
                var boundary: string = multipart.getBoundary(this.req.headers['content-type']);
                Helpers.checkApiLogin(s.db, this.query.login, this.query.password, this.query.version, apiVersion, function(resApiLogin, user) {
                    if (resApiLogin) {
                      s.response.writeHead(resApiLogin);
                      s.response.end();
                      return;
                    }

                    var body: string = '';
                    s.req.on('data', function(chunk) {
                        body += chunk;
                    });
                    s.req.on('end', function() {
                        testLog("41", "[ CHUNK FINISHED ]");
                        body = new Buffer(body,'utf-8');
                        var res: number = 0;
                        console.log(body);
                        var parts = multipart.Parse(body, boundary);

                        var bibinfo = <Bibdata>{};
                        var archive = <Archivedata>{};
                        var media = <Mediadata>{};
                        var metaxml: string;
                        var marcxml: string;
                        var mods: string;

                        for(var i=0; i<parts.length; i++) {
                            var key = parts[i]['filename'];
                            var value = parts[i]['data'].toString('utf8');
                            console.log(key + '=' + value);
                            if (key=='isbn') key = 'ean13';
                            if (key=='part_isbn') key = 'part_ean13';
                            if (key=='meta.xml') {
                                metaxml = value;
                                continue;
                            }
                            if (key=='marcxml.xml') {
                                marcxml = value;
                                continue;
                            }
                            if (key=='mods.xml') {
                                mods = value;
                                continue;
                            }
                            if (key=='media_no') {
                                media.mediaNo = value;
                            }
                            bibinfo[key] = value;
                        }

                        /*************************************
                         * Vyhladat a vytvorit BIBLIO zaznam
                         ************************************/
                        Bibinfo.searchAndCreate(s, bibinfo, function(biblio) {
                            // Vyhladaj BIBLIO zaznam, a v pripade ak neexistuje vytvor
                            var idBiblio;
                            console.dir(biblio);
                            console.log('^^^^^^^^^^^^^^^^^ BIBLIO ^^^^^^^^^^^^^^');
                            if (!biblio) {
                                var err = 'Bibinfo search and create failed';
                                console.log(err);
                                s.send404IfNotValue(res, err);
                                return false;
                            } else {
                                idBiblio = biblio._id;
                            }

                            if (!idBiblio) {
                              var err = '[ ERR ] idBiblio undefined';
                              console.log(err);
                              s.send404IfNotValue(idBiblio, err);
                              return false;
                            }

                            /*************************************
                             * Vyhladat a vytvorit zaznam ARCHIVE
                             ************************************/
                            archive.biblio = idBiblio;
                            archive.creator = user._id;
                            Archive.searchOpenAndCreate(s, archive, function(archiveItems) {
                                var idArchive;
                                var uuid;
                                console.dir(archiveItems);
                                console.log('^^^^^^^^^^^^^^^^^ ARCHIVE ^^^^^^^^^^^^^^');
                                if (!archiveItems) {
                                    var err = 'Archive search and create failed';
                                    console.log(err);
                                    s.send404IfNotValue(res, err);
                                    return false;
                                }
                                else {
                                    idArchive = archiveItems._id;
                                    uuid = archiveItems.uuid;
                                }

                                if (!idArchive) {
                                  var err = '[ ERR ] idArchive undefined';
                                  console.log(err);
                                  s.send404IfNotValue(idArchive, err);
                                  return false;
                                }

                                // vytvorime adresar archivu, pokud jeste neexistuje
                                var archiveDir: string = storageFolder + '/' + uuid;
                                if (!fs.existsSync(archiveDir)){
                                    fs.mkdirSync(archiveDir);
                                    fs.mkdirSync(archiveDir + '/data');
                                }
                                archiveDir = archiveDir + '/data';

                                /*************************************
                                 * Vyhladat a vytvorit zaznam MEDIA
                                 ************************************/
                                media.archive = idArchive;
                                Media.searchAndCreate(s, media, function(mediaItems) {
                                    console.dir(mediaItems);
                                    console.log('^^^^^^^^^^^^^^^^^ MEDIA ^^^^^^^^^^^^^^');
                                    var idMedia;
                                    if (!mediaItems) {
                                        var err = 'Media search and create failed';
                                        console.log(err);
                                        s.send404IfNotValue(res, err);
                                        return false;
                                    }
                                    else {
                                        idMedia = mediaItems._id;
                                    }

                                    if (!idMedia) {
                                      var err = '[ ERR ] idMedia undefined';
                                      console.log(err);
                                      s.send404IfNotValue(idMedia, err);
                                      return false;
                                    }
                                    // vytvorime adresar popisnych metadat DMDSEC, pokud jeste neexistuje
                                    var dmdDir: string = archiveDir + '/dmdsec';
                                    if (!fs.existsSync(dmdDir)){
                                        fs.mkdirSync(dmdDir);
                                    }
                                    // vytvorime adresar administracnich metadat AMDSEC, pokud jeste neexistuje
                                    var amdDir: string = archiveDir + '/amdsec';
                                    if (!fs.existsSync(amdDir)){
                                        fs.mkdirSync(amdDir);
                                    }

                                    var filename, filenameFull;

                                    // META.xml - for each media
                                    if (metaxml.length) {
                                        filename = 'amd_mets_isoimg_' + idMedia + '.xml';
                                        filenameFull = amdDir + '/' + filename;
                                        (function(filename, filenameFull) {
                                            // files data to be writen to DB
                                            var fileinfo: any = <Filesdata>{};
                                            fileinfo.fileName = filename;
                                            fileinfo.fileType = 'amdsec-media-meta';
                                            fileinfo.fileSize = metaxml.length;
                                            fileinfo.checkSum = crypto.createHash('md5').update(metaxml, 'utf8').digest('hex');
                                            fileinfo.media = idMedia;
                                            Files.searchAndCreate(s, fileinfo, function(fileDoc) {
                                                // write file to storage
                                                fs.writeFileSync(filenameFull, metaxml);
                                            });
                                        }(filename, filenameFull));
                                    }

                                    // MARC.xml - for easinglech archive
                                    if (marcxml.length) {
                                        filename = 'dmd_marc_' + idArchive + '.xml';
                                        filenameFull = dmdDir + '/' + filename;
                                        (function(filename, filenameFull) {
                                            // files data to be writen to DB
                                            var fileinfo: any = <Filesdata>{};
                                            fileinfo.fileName = filename;
                                            fileinfo.fileType = 'dmdsec-archive-marc';
                                            fileinfo.fileSize = marcxml.length;
                                            fileinfo.checkSum = crypto.createHash('md5').update(marcxml, 'utf8').digest('hex');
                                            fileinfo.archive = idArchive;
                                            Files.searchAndCreate(s, fileinfo, function(fileDoc) {
                                                // write file to storage
                                                fs.writeFileSync(filenameFull, marcxml);
                                            });
                                        }(filename, filenameFull));
                                    }

                                    // MODS.xml - for single archive
                                    if (mods.length) {
                                        filename = 'dmd_mods_' + uuid + '.xml';
                                        filenameFull = dmdDir + '/' + filename;
                                        (function(filename, filenameFull) {
                                            // files data to be writen to DB
                                            var fileinfo: any = <Filesdata>{};
                                            fileinfo.fileName = filename;
                                            fileinfo.fileType = 'dmdsec-archive-mods';
                                            fileinfo.fileSize = mods.length;
                                            fileinfo.checkSum = crypto.createHash('md5').update(mods, 'utf8').digest('hex');
                                            fileinfo.archive = idArchive;
                                            Files.searchAndCreate(s, fileinfo, function(fileDoc) {
                                                // write file to storage
                                                var modsFormatted = xmlFormatter(mods, {indentation: "\t", stripComments: true});
                                                modsFormatted = modsFormatted.replace(new RegExp("\t<", 'g'), "\t<mods:");
                                                modsFormatted = modsFormatted.replace(new RegExp("\t</", 'g'), "\t</mods:");
                                                fs.writeFileSync(filenameFull, modsFormatted);
                                            });
                                        }(filename, filenameFull));
                                    }

                                    console.log('[ API IMPORT FINISHED ] idBiblio: ' + idBiblio.toString());
                                    console.log('[ API IMPORT FINISHED ] idArchive: ' + idArchive.toString());
                                    console.log('[ API IMPORT FINISHED ] idMedia (result): ' + idMedia.toString());
                                    s.response.writeHead(200);
                                    s.response.end(idMedia.toString());
                                });
                            });
                        });
                    });
                });
            } else {
                s.send404IfNotValue(false, 'POST method required');
            }
        }// API IMPORT


        /**
         * ISO FILE UPLOAD
         **/
        else if (this.requrl.indexOf(urlUpload) > 0) {
            testLog("41", "[ RECEIVING CHUNK ]");

            if (this.req.method == 'POST') {
                testLog("41", "POST");

                var mediaId: string = this.req.headers['x-cdarcha-mediaid'];
                var mediaChecksum: string = this.req.headers['x-cdarcha-checksum'];
                var fileType: string = this.req.headers['x-cdarcha-filetype'] || 'iso';
                var quickId: string = this.req.headers['x-cdarcha-quickid'] || '';
                var mediaSize: number = parseInt(this.req.headers['x-cdarcha-mediasize']) || 0;
                var mediaReadProblem: number = parseInt(this.req.headers['x-cdarcha-mediareadproblem']) || 0;
                var forcedUpload: number = parseInt(this.req.headers['x-cdarcha-forcedupload']) || 0;

                // mediaid a checksum je povinne
                if (!mediaId || !mediaChecksum) {
                    s.response.writeHead(404);
                    s.response.end('mediaid or checksum missing');
                    return;
                }

                var hash = crypto.createHash('md5');
                hash.setEncoding('hex');

                var writeStream = fs.createWriteStream(tmpFolder + '/iso/' + mediaId + '.iso', {flags: 'w'});
                this.req.pipe(writeStream, { end: false });
                this.req.pipe(hash);

                this.req.on('end', function() {
                    testLog("41", "[ CHUNK FINISHED ]");
                    writeStream.end();
                    hash.end();
                    var checksum: string = hash.read();
                    console.log('%%%%%%%');
                    console.log(mediaChecksum);
                    console.log(checksum);
                    console.log('%%%%%%%');

                    var success: bool = (mediaChecksum == checksum);

                    var mediaFile: any = {
                        'fileType': fileType,
                        'checkSum': checksum,
                        'quickId': quickId,
                        'mediaSize': mediaSize,
                        'mediaReadProblem': mediaReadProblem,
                        'forcedUpload': forcedUpload,
                        'fileName': mediaId + '.iso',
                        'dtLastUpdate': new Date()
                    };

                    if (success) {
                        s.db.collection(mediaCollection).findOne({ _id: new mongo.ObjectID(mediaId)}, function(err: any, mediaItem: any) {
                            if (err) {
                                console.log(err);
                                s.send404IfNotValue(null, err);
                                return false;
                            }

                            var archiveId: any = mediaItem.archive;
                            s.db.collection(mediaCollection).update({ _id: new mongo.ObjectID(mediaId) }, { $set: mediaFile });

                            s.db.collection(archiveCollection).findOne({ _id: new mongo.ObjectID(archiveId) }, function(err, archive) {
                                if (err) {
                                    console.log(err);
                                    s.send404IfNotValue(null, err);
                                    return false;
                                }

                                // vytvorime adresar archivu, pokud jeste neexistuje
                                var archiveDir: string = storageFolder + '/' + archive.uuid;
                                if (!fs.existsSync(archiveDir)){
                                    fs.mkdirSync(archiveDir);
                                    fs.mkdirSync(archiveDir + '/data');
                                }
                                archiveDir = archiveDir + '/data';

                                // vytvorime adresar media, pokud jeste neexistuje
                                var masterCopyDir: string = archiveDir + '/isoimage';
                                if (!fs.existsSync(masterCopyDir)){
                                    fs.mkdirSync(masterCopyDir);
                                }

                                // uklidime docasny soubor
                                fs.copyFileSync(tmpFolder + '/iso/' + mediaId + '.iso', masterCopyDir + '/' + mediaId + '.' + fileType);
                                fs.unlinkSync(tmpFolder + '/iso/' + mediaId + '.iso');
                            });
                        });
                    } else {
                        // kontrolni soucet nesedi, upload se nepoved, uklidime docasny soubor
                        //fs.unlinkSync(tmpFolder + '/iso/' + mediaId + '.iso');
                    }

                    s.response.writeHead(200);
                    s.response.end('ok');
                });
            } else {
                this.send404IfNotValue(false, 'POST method required');
            }
        }// ISO FILE UPLOAD


        /**
         * COVER/TOC UPLOAD
         **/
        else if (this.requrl.indexOf(urlCoverUpload) > 0) {
            testLog("41", "[ API COVER UPLOAD ]");

            if (this.req.method == 'POST') {
                const boundary: string = multipart.getBoundary(this.req.headers['content-type']);
                const boundaryRe = new RegExp(boundary, 'g');

                var body: string = '',
                    writeStream = null; // for streamed file write

                this.req.on('data', function(chunk) {
                    var chunkString: string = chunk.toString();
                    // indicates that next chunk will be octet stream
                    if (chunkString.match(/Content\-Type\: image\/tif/)) {
                        const fileNameArray: array = chunkString.match(/filename=\"(.*)\"/);
                        const fileName: string = fileNameArray[1];
                        // finish octet stream if any (when transfering toc_2 after toc_1 after cover, ...)
                        if (writeStream) {
                            writeStream.end();
                            writeStream = null;
                        };
                        if (!writeStream && fileName) {
                            // starting with incomming file stream
                            writeStream = fs.createWriteStream(tmpFolder + '/scan/' + boundary + '-' + fileName, {flags: 'a'});
                        }
                        // text form data - octet stream form data header
                        body += chunk;
                    }
                    else if (writeStream) {
                        // continuing or ending octet stream
                        if (chunkString.match(boundaryRe)) {
                            // end of octet stream
                            writeStream.end();
                            // text form data
                            body += chunk;
                        } else if (writeStream._writableState.ended == false) {
                            // continuing octet stream - write chunk to the file
                            writeStream.write(chunk);
                        }
                    }
                    else {
                        // text form data
                        body += chunk;
                    }
                });

                this.req.on('end', function() {
                    testLog("41", "[ CHUNK COVER UPLOAD FINISHED ]");
                    body = new Buffer(body,'utf-8');
                    var parts = multipart.Parse(body, boundary);

                    var metaxml: string = '';

                    // media_id
                    var id = null;
                    for(var i=0; i<parts.length; i++) {
                        var key = parts[i]['filename'];
                        var value = parts[i]['data'].toString('utf8');
                        if (key == 'id') {
                            id = value;
                            var idMatches: any = id.match(/[a-fA-F0-9]+/g);
                            if (idMatches && idMatches[0]) { id = idMatches[0]; }
                        } else if (key == 'meta.xml') {
                            metaxml = value;
                        }
                    }

                    if (!id) {
                        testLog("32", 'ID MISSING');
                        s.response.writeHead(404);
                        s.response.end('Archive or medium ID missing');
                        return;
                    }

                    // Je nam poskytnute jedno ID a nevime jestli media, nebo archivu (skenovat se muze k mediu = skutecny obrazek media, nebo k archivu = reprezentativny obrazek),
                    // proto zkusime jedno i druhe
                    (function(id, metaxml){
                        s.db.collection(mediaCollection).findOne({ _id: new mongo.ObjectID(id) }, function(err, mediaDoc) {
                            if (err) {
                                console.dir(err);
                                s.response.writeHead(404);
                                s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                                return;
                            }

                            var archiveId;
                            if (mediaDoc) {
                                archiveId = mediaDoc.archive;
                            } else {
                                archiveId = id;
                            }

                            s.db.collection(archiveCollection).findOne({ _id: new mongo.ObjectID(archiveId) }, function(err, archiveDoc) {
                                if (err) {
                                    console.dir(err);
                                    s.response.writeHead(404);
                                    s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                                    return;
                                }

                                var archiveUuid: string = archiveDoc.uuid;
                                var archiveDir: string = storageFolder + '/' + archiveUuid;

                                // search for cover+toc in form data
                                for(var i=0; i<parts.length; i++) {
                                    (function(part) {
                                        var filename = part['filename'];
                                        // process octet stream = cover+toc
                                        const filenamePrefix9 = filename.substring(0,9);
                                        const filenameFull = tmpFolder + '/scan/' + boundary + '-' + filename;
                                        if (filenamePrefix9=='cover.tif' || filenamePrefix9=='toc_page_') {
                                            // open file to get md5 hash
                                            fs.readFile(filenameFull, function(err, fileData) {
                                                if (err) {
                                                    console.dir(err);
                                                    s.response.writeHead(404);
                                                    s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                                                    return;
                                                }

                                                // get file size
                                                const stats: any = fs.statSync(filenameFull);
                                                const fileSizeInBytes: number = stats.size;
                                                // files data to be writen to DB
                                                var fileinfo: any = <Filesdata>{};
                                                fileinfo.fileName = id + '-' + filename;
                                                fileinfo.fileType = (filenamePrefix9=='cover.tif' ? 'cover' : 'toc');
                                                fileinfo.fileSize = fileSizeInBytes;
                                                // get file checksum
                                                fileinfo.checkSum = crypto.createHash('md5').update(fileData, 'utf8').digest('hex');
                                                // archive or media id
                                                if (mediaDoc) {
                                                    fileinfo.media = mediaDoc._id;
                                                } else if (archiveDoc) {
                                                    fileinfo.archive = archiveDoc._id;
                                                }
                                                // write filedata to debug
                                                Files.insertUnique(s, fileinfo, function(result) {
                                                    if (!fs.existsSync(archiveDir)){
                                                        fs.mkdirSync(archiveDir);
                                                        fs.mkdirSync(archiveDir + '/data');
                                                    }

                                                    var masterCopyDir: string = archiveDir + '/data/mastercopyscan';
                                                    if (!fs.existsSync(masterCopyDir)){
                                                        fs.mkdirSync(masterCopyDir);
                                                    }
                                                    // cleanup uploaded file
                                                    fs.copyFileSync(filenameFull, masterCopyDir + '/' + (mediaDoc ? mediaDoc._id : archiveDoc._id) + '-' + filename);
                                                    fs.unlinkSync(filenameFull);

                                                    var amdDir: string = archiveDir + '/data/amdsec';
                                                    if (!fs.existsSync(amdDir)){
                                                        fs.mkdirSync(amdDir);
                                                    }

                                                    // META.xml - for each media
                                                    if (metaxml.length) {
                                                        if (mediaDoc) {
                                                          console.log('mediaDoc');
                                                          console.log(mediaDoc._id);
                                                        }
                                                        if (archiveDoc) {
                                                          console.log('archiveDoc');
                                                          console.log(archiveDoc._id);
                                                        }
                                                        var filenameDotParts: any = filename.split('.');
                                                        var filenameWoExtension: string = filenameDotParts[0];
                                                        var filenameMetaXml: string = 'amd_mets_' + (mediaDoc ? mediaDoc._id : archiveDoc._id) + '-' + filenameWoExtension + '.xml';
                                                        var filenameFullMetaXml = amdDir + '/' + filenameMetaXml;
                                                        (function(filenameFullMetaXml, scanFileId) {
                                                            // files data to be writen to DB
                                                            var fileinfo: any = <Filesdata>{};
                                                            fileinfo.parent = scanFileId;
                                                            fileinfo.fileName = filenameMetaXml;
                                                            fileinfo.fileType = 'amdsec-scan-meta-' + result.fileType;
                                                            fileinfo.fileSize = metaxml.length;
                                                            fileinfo.checkSum = crypto.createHash('md5').update(metaxml, 'utf8').digest('hex');
                                                            if (mediaDoc) {
                                                                fileinfo.media = mediaDoc._id;
                                                            } else {
                                                                fileinfo.archive = archiveDoc._id;
                                                            }
                                                            Files.insertUnique(s, fileinfo, function() {
                                                                // write file to storage
                                                                fs.writeFileSync(filenameFullMetaXml, metaxml);
                                                            });
                                                        }(filenameFullMetaXml, result._id));
                                                    }
                                                });
                                            });
                                        }
                                    }(parts[i]));
                                }
                            });
                        });
                    })(id, metaxml);
                    console.log('[ API COVER UPLOAD FINISHED ]');
                    s.response.writeHead(200);
                    s.response.end('ok');
                });
            } else {
                s.send404IfNotValue(false, 'POST method required');
            }
        }// COVER/TOC UPLOAD


        /**
         * API GET HASH
         **/
        else if (this.requrl.indexOf(apiChecksum) > 0) {
            testLog("41", "[ API CHECKSUM ]");

            if (!this.query.mediaid) {
                s.response.writeHead(404);
                s.response.end(JSON.stringify({ "status": "mediaid missing" }));
                return;
            }

            s.db.collection(mediaCollection).findOne({ _id: new mongo.ObjectID(this.query.mediaid) }, function(err, item) {
                if (err) {
                    s.response.writeHead(404);
                    s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                    return;
                }
                if (!item) {
                    s.response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
                    s.response.end(JSON.stringify({ "status": "not found" }));
                    return;
                }

                if (!item.checkSum) {
                    s.response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
                    s.response.end(JSON.stringify({ "status": "not prepared" }));
                } else {
                    s.response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
                    s.response.end(JSON.stringify({ "status": "ok", "hash": item.checkSum }));
                }
            });
        }// API GET HASH


        /**
         * API GET MEDIA
         **/
        else if (this.requrl.indexOf(apiGetMedia) > 0) {
            testLog("41", "[ API GET MEDIA ]");

            if (!this.query.quickid) {
                s.response.writeHead(404);
                s.response.end(JSON.stringify({ "status": "quickid missing" }));
                return;
            }

            s.db.collection(mediaCollection).findOne({ 'quickId': this.query.quickid }, function(err, media) {
                if (err) {
                    s.response.writeHead(404);
                    s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                    return;
                }
                if (!media) {
                    s.response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
                    s.response.end(JSON.stringify({ "status": "media not found" }));
                    return;
                }

                s.db.collection(archiveCollection).findOne({ _id: media.archive }, function (err, archive) {
                    if (err) {
                        s.response.writeHead(404);
                        s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                        return;
                    }
                    if (!archive) {
                        s.response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
                        s.response.end(JSON.stringify({ "status": "archive not found" }));
                        return;
                    }
                    s.db.collection(metaCollection).findOne({ _id: archive.biblio }, function (err, biblio) {
                        if (err) {
                            s.response.writeHead(404);
                            s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                            return;
                        }
                        if (!biblio) {
                            s.response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
                            s.response.end(JSON.stringify({ "status": "biblio not found" }));
                            return;
                        }

                        s.response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
                        let dtLastUpdate = null;
                        if (media.dtLastUpdate) {
                            if (typeof media.dtLastUpdate == 'string') {
                                dtLastUpdate = new Date(media.dtLastUpdate);
                            } else {
                                dtLastUpdate = media.dtLastUpdate.getDate() + '.' + (media.dtLastUpdate.getMonth() + 1) + '.' + media.dtLastUpdate.getFullYear();
                            }
                        }
                        s.response.end(JSON.stringify({
                            "dtUpdate": dtLastUpdate,
                            "title": biblio.title,
                            "authors": biblio.authors,
                            "year": biblio.year,
                            "size": media.mediaSize,
                            "mediaReadProblem": media.mediaReadProblem
                        }));
                    });
                });
            });
        }// API GET MEDIA



        /**
         * API GET ALL MEDIA
         * Vylistuje vsechny archivy a media k danemu bibliografickemu zaznamu
         **/
        else if (this.requrl.indexOf(apiGetAllMediaList) > 0) {
            testLog("41", "[ API GET ALL MEDIA LIST ]");

            Helpers.checkApiLogin(s.db, this.query.login, this.query.password, this.query.version, apiVersion, function(resApiLogin) {
                if (resApiLogin) {
                  s.response.writeHead(resApiLogin);
                  s.response.end();
                  return;
                }

                else if (s.req.method == 'POST') {
                    testLog("41", "POST");
                    var boundary: string = multipart.getBoundary(s.req.headers['content-type']);

                    var body: string = '';
                    s.req.on('data', function(chunk) {
                        body += chunk;
                    });
                    s.req.on('end', function() {
                        testLog("41", "[ CHUNK FINISHED ]");
                        body = new Buffer(body,'utf-8');
                        var parts = multipart.Parse(body, boundary);

                        var bibinfo = <Bibdata>{};

                        for(var i=0; i<parts.length; i++) {
                            var key = parts[i]['filename'];
                            if (key=='isbn') key = 'ean13';
                            if (key=='ean13' || key=='ismn' || key=='oclc' || key=='nbn' || key=='uuid' || key=='title' || key=='authors' || key=='year' || key.slice(0,5)=='part_') {
                                bibinfo[key] = parts[i]['data'].toString('utf8');
                            }
                        }

                        /*************************************
                         * Vyhladat a vytvorit BIBLIO zaznam
                         ************************************/
                        Bibinfo.search(s, bibinfo, function(biblio) {
                            // Vyhladaj BIBLIO zaznam
                            var idBiblio;
                            if (!biblio) {
                                s.response.writeHead(200);
                                s.response.end();
                                return false;
                            } else {
                                idBiblio = biblio._id;
                            }

                            s.db.collection(archiveCollection).findOne({ biblio: idBiblio }, function(err, archive) {
                                // Vyhladaj ARCHIVE zaznam
                                var idArchive;
                                if (!archive) {
                                    s.response.writeHead(200);
                                    s.response.end();
                                    return false;
                                } else {
                                    idArchive = archive._id;
                                }

                                var archiveDate = new Date(archive.dtLastUpdate);
                                var out = new Array();
                                out.push({
                                    'id': idArchive,
                                    'type': 'archive',
                                    'mediaNo': null,
                                    'status': archive.status,
                                    'dtLastUpdate': archive.dtLastUpdate,
                                    'text': 'Archiv:   ' + idArchive + '   (' + archiveDate.getDate()+'.'+(archiveDate.getMonth() + 1)+'.'+archiveDate.getFullYear() + ')'
                                });

                                s.db.collection(mediaCollection).find({ archive: idArchive }).sort({ mediaNo : 1 }).toArray(function(err, media) {
                                    // Vyhladaj MEDIA zaznam
                                    if (media && media.length) {
                                        for (var i=0; i<media.length; i++) {
                                            var item = media[i];
                                            var mediaDate = new Date(item.dtLastUpdate);
                                            out.push({
                                                'id': item._id,
                                                'type': 'media',
                                                'mediaNo': item.mediaNo,
                                                'status': null,
                                                'dtLastUpdate': item.dtLastUpdate,
                                                'text': 'Médium:   ' + item.mediaNo + '   (' + mediaDate.getDate()+'.'+(mediaDate.getMonth() + 1)+'.'+mediaDate.getFullYear() + ')'
                                            });
                                        }
                                    }

                                    s.response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
                                    s.response.end(JSON.stringify(out));
                                });
                            });
                        });
                    });
                }
            });
        }// API GET ALL MEDIA


        /**
         * API CLOSE ARCHIVE
         * Close archive record
         **/
        else if (this.requrl.indexOf(apiCloseArchive) > 0) {
            testLog("41", "[ API CLOSE ARCHIVE ]");

            const id = this.query.id;
            if (!id) {
                s.response.writeHead(404);
                s.response.end(JSON.stringify({ "status": "id missing" }));
                return;
            }

            s.db.collection(archiveCollection).findOne({ _id: new mongo.ObjectID(id) }, function(err, archiveDoc) {
                if (err) {
                    console.dir(err);
                    s.response.writeHead(404);
                    s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                    return;
                }
                s.db.collection(mediaCollection).findOne({ _id: new mongo.ObjectID(id) }, function(err, mediaDoc) {
                    if (err) {
                        console.dir(err);
                        s.response.writeHead(404);
                        s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                        return;
                    }

                    const archiveId = archiveDoc ? id : mediaDoc.archive;
                    s.db.collection(archiveCollection).update({ _id: new mongo.ObjectID(archiveId) }, { $set: { status: 1 } });
                });
            });
        }

        /**
         * FILE STORAGE
         **/
        else if ((this.requrl.indexOf(urlStorage)) > 0) {
            //var sigla: any = Permissions.refererValid(this.referer, this.remoteIP, this.encsigla);
            testLog("41", "[FILE STORAGE] Sigla:" + sigla);

            var reqUrl: any = this.requrl.split('?')[0];
            var file: string = storageFolder + '/' + reqUrl.substring(urlStorage.length + 1);

            testLog("41", "-> reqUrl:" + reqUrl);

            if (fs.existsSync(file)) {
                if ((this.requrl.indexOf('.iso')) > 0) {
                    s.response.writeHead(200, { 'Content-Type': 'application/iso' });
                } else {
                    s.response.writeHead(200, { 'Content-Type': 'text/xml' });
                }
                var readStream: any = fs.createReadStream(file);
                readStream.pipe(this.response);
            } else {
                s.send404IfNotValue(null, 'No such file in storage.');
            }
        }

        /**
         * METADATA
         **/
        // https://cdarcha.mzk.cz/api/media/?multi=[{%22isbn%22:%229788376663103%22},{%22isbn%22:%229788376663203%22}]
        else if ((this.requrl.indexOf(urlMetadata)) > 0) {
            var json: any = [],
                multis: any = [];

            // podpora dotazu na jeden zaznam
            if (!this.query.multi) {
                var multi = {};
                for (var queryKey in this.query) {
                    switch (queryKey) {
                        case 'isbn':
                        case 'ean': multi[queryKey] = this.query.isbn; break;
                        case 'nbn': multi[queryKey] = this.query.nbn; break;
                        case 'ismn': multi[queryKey] = this.query.ismn; break;
                        case 'oclc': multi[queryKey] = this.query.oclc; break;
                        case 'uuid': multi[queryKey] = this.query.uuid; break;
                        case 'sysno': multi[queryKey] = this.query.sysno; break;
                        case 'sigla': multi[queryKey] = this.query.sigla; break;
                    }
                }
                multis.push(multi);
            }
            else {
                try {
                    multis = JSON.parse(decodeURIComponent(this.query.multi));
                } catch (err) {
                    this.send404IfNotValue(false, 'Check query syntax');
                    return;
                }
            }

            (async function() {
                // pro kazdou polozku v poli multi
                for (var i: number = 0; i < multis.length; i++) {
                    var multi: any = multis[i],
                        queryBiblio: any = [],
                        queryArchive: any = null;

                    // UUID nejvyssi priorita
                    if (multi.uuid) {
                        queryArchive = { uuid: multi.uuid };
                    }
                    // prima identifikace biblio zaznamu
                    else if (multi.sigla && multi.sysno) {
                        queryBiblio.push({ sysno: multi.sysno, sigla: multi.sigla });
                    }
                    // identifikace biblio zaznamu pomoci obecnych identifikatoru
                    else {
                        for (var queryKey in multi) {

                            if (queryKey == 'isbn' || queryKey == 'ean') {
                                var isbn: string = queryKey == 'isbn' ? multi.isbn : multi.ean;
                                isbn = isbn.split(' ')[0];
                                if (isbn.length) {
                                    var ean: string = toEan(isbn);
                                    if (ean.length) {
                                        queryBiblio.push({ ean13: ean });
                                    }
                                }
                            }
                            else if (queryKey == 'nbn') {
                                queryBiblio.push({ nbn: multi.nbn });
                            }
                            else if (queryKey == 'ismn') {
                                queryBiblio.push({ ismn: multi.ismn });
                            }
                            else if (queryKey == 'oclc') {
                                queryBiblio.push({ oclc: multi.oclc });
                            }
                        }
                    }


                    let archive: any = null,
                        biblio: any = null,
                        item: any = {};

                    // prvni vyhledani budto archivu (ma prednost), nebo biblio zaznamu
                    if (queryArchive)
                        archive = await s.db.collection(archiveCollection).findOne(queryArchive);
                    else if (queryBiblio.length)
                        biblio = await s.db.collection(metaCollection).findOne({ $or: queryBiblio });

                    // potrebujeme aby bolo nalezeno alespon jedno, jinak nemame podle ceho dale dohledavat media a soubory
                    if (archive || biblio) {
                        // druhe kolo dohledavani archiv a biblio zaznamu (jeden uz mame z predchoziho selektu, ted dohledame druhy z dvojice)
                        if (archive)
                            biblio = await s.db.collection(metaCollection).findOne({ _id: archive.biblio });
                        else
                            archive = await s.db.collection(archiveCollection).findOne({ biblio: biblio._id });

                        // uzivatel ktery archiv vytvoril
                        const creator = await s.db.collection(usersCollection).findOne({ _id: archive.creator });

                        // doplnime info z biblio zaznamu a archivu
                        const uuid: string = archive.uuid;
                        item.uuid = uuid;
                        item.status = archive.status;
                        item.statusHuman = statusHuman[archive.status];
                        item.dtCreated = new Date(archive.dtCreated).toISOString();
                        item.dtLastUpdate = new Date(archive.dtLastUpdate).toISOString();
                        item.creatorSigla = creator.sigla;
                        if (biblio.ean13) item.ean13 = biblio.ean13;
                        if (biblio.ismn) item.ismn = biblio.ismn;
                        if (biblio.nbn) item.nbn = biblio.nbn;
                        if (biblio.oclc) item.oclc = biblio.oclc;
                        if (biblio.sigla) item.sigla = biblio.sigla;
                        if (biblio.sysno) item.sysno = biblio.sysno;
                        if (biblio.title) item.title = biblio.title;
                        if (biblio.authors) item.authors = biblio.authors;
                        if (biblio.year) item.year = biblio.year;
                        item.files = []; // ostatni soubory archivu

                        // ostatni generovane soubory SIP baliku
                        if (fs.existsSync(storageFolder + '/' + uuid + '/' + 'bagit.txt'))
                            item.files.push({ fileType: 'bagit', fileName: 'bagit.txt' });

                        if (fs.existsSync(storageFolder + '/' + uuid + '/' + 'manifest-md5.txt'))
                            item.files.push({ fileType: 'manifest-md5', fileName: 'manifest-md5.txt' });

                        if (fs.existsSync(storageFolder + '/' + uuid + '/data/droid_' + uuid + '.xml'))
                            item.files.push({ fileType: 'droid', fileName: 'data/droid_' + uuid + '.xml' });

                        if (fs.existsSync(storageFolder + '/' + uuid + '/data/info_' + uuid + '.xml'))
                            item.files.push({ fileType: 'info', fileName: 'data/info_' + uuid + '.xml' });

                        if (fs.existsSync(storageFolder + '/' + uuid + '/data/main_mets_' + uuid + '.xml'))
                            item.files.push({ fileType: 'main-mets', fileName: 'data/main_mets_' + uuid + '.xml' });

                        if (fs.existsSync(storageFolder + '/' + uuid + '/data/md5_' + uuid + '.xml'))
                            item.files.push({ fileType: 'md5', fileName: 'data/md5_' + uuid + '.xml' });

                        // soubory archivu
                        const cursorFileArchive: any = s.db.collection(filesCollection).find({ archive: archive._id });
                        while(await cursorFileArchive.hasNext()) {
                            const fileArchive = await cursorFileArchive.next();

                            // reprezentativni obalka
                            if (fileArchive.fileType == 'cover') {
                                item.coverMasterCopy = 'data/' + subdirByPrefix[fileArchive.fileName.substring(0,3)] + fileArchive.fileName;
                                // usercopy reprezentativni obalka
                                if (fs.existsSync(storageFolder + '/' + uuid + '/data/usercopyscan/' + fileArchive.fileName.replace('mcs_','ucs_')))
                                    item.coverUserCopy = 'data/usercopyscan/' + fileArchive.fileName;
                            }
                            // reprezentativni toc
                            else if (fileArchive.fileType == 'toc') {
                                item.toc = 'data/' + subdirByPrefix[fileArchive.fileName.substring(0,3)] + fileArchive.fileName;
                                // usercopy reprezentativni toc
                                if (fs.existsSync(storageFolder + '/' + uuid + + '/data/usercopyscan/' + fileArchive.fileName.replace('mcs_','ucs_')))
                                    item.tocUserCopy = 'data/usercopyscan/' + fileArchive.fileName;
                            }
                            // jiny typ souboru napr. mods
                            else {
                                item.files.push({
                                    fileName: 'data/' + subdirByPrefix[fileArchive.fileName.substring(0,3)] + fileArchive.fileName,
                                    fileType: fileArchive.fileType,
                                });
                            }

                            // media archivu
                            item.media = [];
                            const cursorMedia: any = s.db.collection(mediaCollection).find({ archive: archive._id });
                            while(await cursorMedia.hasNext()) {
                                const media = await cursorMedia.next();

                                // soubory media
                                var itemMediaFiles: any = [];
                                const cursorFilesMedia: any = s.db.collection(filesCollection).find({ media: media._id });
                                while(await cursorFilesMedia.hasNext()) {
                                    const fileMedia = await cursorFilesMedia.next();

                                    itemMediaFiles.push({
                                        fileName: 'data/' + subdirByPrefix[fileMedia.fileName.substring(0,3)] + fileMedia.fileName,
                                        fileType: fileMedia.fileType,
                                    });

                                    // abbyy soubory
                                    if (fileMedia.fileName.substring(0,3) == 'mcs') {
                                        const fileExt: string = fileMedia.fileName.slice(-4);
                                        if (fs.existsSync(storageFolder + '/' + uuid + '/data/mastercopyscan/' + fileMedia.fileName.replace(fileExt, '.txt'))) {
                                            itemMediaFiles.push({
                                                fileName: 'data/' + subdirByPrefix[fileMedia.fileName.substring(0,3)] + fileMedia.fileName.replace(fileExt, '.txt'),
                                                fileType: fileMedia.fileType + '-ocr-txt',
                                            });
                                        }
                                        if (fs.existsSync(storageFolder + '/' + uuid + '/data/mastercopyscan/' + fileMedia.fileName.replace(fileExt, '.xml'))) {
                                            itemMediaFiles.push({
                                                fileName: 'data/' + subdirByPrefix[fileMedia.fileName.substring(0,3)] + fileMedia.fileName.replace(fileExt, '.xml'),
                                                fileType: fileMedia.fileType + '-ocr-alto',
                                            });
                                        }
                                    }
                                }

                                item.media.push({
                                    mediaNo: media.mediaNo,
                                    fileName: 'data/isoimage/' + media.fileName,
                                    fileType: media.fileType,
                                    fileSize: media.mediaSize,
                                    checksum: media.checksum,
                                    repeatedUpload: media.forcedUpload,
                                    mediaFiles: itemMediaFiles
                                });
                            }
                        }

                    } // if (archive || biblio)

                    json.push(item);

                } // pro kazdou polozku v poli multi

                s.response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
                s.response.end(JSON.stringify(json, null, ' '));
            })();
        } // api metadata

        /**
         * ALIVE
         **/
        else if ((this.requrl.indexOf(uriAlive)) > 0) {
            this.response.setHeader("Access-Control-Allow-Origin", "*");
            this.response.setHeader("Access-Control-Allow-Methods", "GET");
            this.response.setHeader("Access-Control-Allow-Header", "*");
            this.response.writeHead(200);
            this.response.end('ALIVE');
        }

        else {
            console.log("wrong query");
            this.send404IfNotValue(false);
        }

    }

    //ak posle vrati true, ak neposle vrati false
    send404IfNotValue(value: any, message: any = undefined) {
        if (!value) {
            this.response.writeHead(404);

            if (message)
                this.response.end(message);
            else
                this.response.end();

            return true;
        }
        else {
            return false;
        }
    }

    getItemInfoFromItem(item: any): ItemInfo {
        var itemInfo = <ItemInfo>{};
        itemInfo.item = item;
        itemInfo.ean13 = item.ean13;
        itemInfo.ean13_other = item.ean13_other;
        itemInfo.nbn = item.nbn;
        itemInfo.ismn = item.ismn;
        itemInfo.oclc = item.oclc;
        itemInfo.uuid = item.uuid;
        itemInfo.part_year = item.part_year;
        itemInfo.part_volume = item.part_volume;
        itemInfo.part_no = item.part_no;
        itemInfo.part_name = item.part_name;
        itemInfo.part_root = item.part_root || '1';
        itemInfo.part_ean13_standalone = item.part_ean13_standalone || '0';
        itemInfo.part_nbn_standalone = item.part_nbn_standalone || '0';
        itemInfo.part_ismn_standalone = item.part_ismn_standalone || '0';
        itemInfo.part_oclc_standalone = item.part_oclc_standalone || '0';
        return itemInfo;
    }

    isGoodItemInfoForBibInfo(itemInfo: ItemInfo, bibinfo: any): boolean {
        return (
            // periodikum podle roku a cisla
            (itemInfo.part_year && itemInfo.part_no && bibinfo.part_year && bibinfo.part_no && itemInfo.part_year == bibinfo.part_year && itemInfo.part_no == bibinfo.part_no) ||
            // periodikum podle rocniku a cisla
            (itemInfo.part_volume && itemInfo.part_no && bibinfo.part_volume && bibinfo.part_no && itemInfo.part_volume == bibinfo.part_volume && itemInfo.part_no == bibinfo.part_no) ||
            // periodikum podle roku a rocniku
            ((itemInfo.part_year || itemInfo.part_volume) && !itemInfo.part_no && (bibinfo.part_year || bibinfo.part_volume) && ((itemInfo.part_year == bibinfo.part_year && itemInfo.part_year) || (itemInfo.part_volume == bibinfo.part_volume && itemInfo.part_volume))) ||
            // monografie podle cisla casti
            (itemInfo.part_no && bibinfo.part_no && !bibinfo.part_year && !bibinfo.part_volume && itemInfo.part_no == bibinfo.part_no) ||
            // monografie podle nazvu casti
            (itemInfo.part_name && bibinfo.part_name && !bibinfo.part_year && !bibinfo.part_volume && itemInfo.part_name == bibinfo.part_name) ||
            // souborny zaznam, nebo cast monografie bez dotazu na konkretni cast
            (!bibinfo.part_no && !bibinfo.part_name && !bibinfo.part_year && !bibinfo.part_volume) ||
            // souborny zaznam, s dotazem na cast monografie bez dotazu na konkretni cast
            (!bibinfo.part_year && !bibinfo.part_volume && !itemInfo.part_no && !itemInfo.part_name));
    }

    itemFound(itemInfo: ItemInfo, bibinfo: any, j: number): boolean {
        if (j == 0 && bibinfo.isbn) {
            // ISBN
            var isbnBib: any = bibinfo.isbn.split(' ')[0];
            isbnBib = toEan(isbnBib);
            if (!isbnBib || !itemInfo.ean13) return false;
            if (isbnBib != itemInfo.ean13) return false;
            if (itemInfo.part_root == '0' && itemInfo.part_ean13_standalone == '0' && !(bibinfo.part_no || bibinfo.part_name || bibinfo.part_year || bibinfo.part_volume)) return false;
            return true;
        } else if (j == 1 && bibinfo.nbn) {
            // NBN
            if (!bibinfo.nbn || !itemInfo.nbn) return false;
            if (bibinfo.nbn != itemInfo.nbn) return false;
            if (itemInfo.part_root == '0' && itemInfo.part_nbn_standalone == '0' && !(bibinfo.part_no || bibinfo.part_name || bibinfo.part_year || bibinfo.part_volume)) return false;
            return true;
        } else if (j == 2 && bibinfo.oclc) {
            // OCLC
            if (!bibinfo.oclc || !itemInfo.oclc) return false;
            if (bibinfo.oclc != itemInfo.oclc) return false;
            if (itemInfo.part_root == '0' && itemInfo.part_oclc_standalone == '0' && !(bibinfo.part_no || bibinfo.part_name || bibinfo.part_year || bibinfo.part_volume)) return false;
            return true;
        } else if (j == 3 && bibinfo.uuid) {
            // UUID
            if (!bibinfo.uuid.length || !itemInfo.uuid) return false;
            return (itemInfo.uuid.indexOf(bibinfo.uuid) > -1) ? true : false;
        } else if (j == 4 && bibinfo.ismn) {
            // ISMN
            if (!bibinfo.ismn || !itemInfo.ismn) return false;
            bibinfo.ismn = bibinfo.ismn;
            if (bibinfo.ismn != itemInfo.ismn) return false;
            if (itemInfo.part_root == '0' && itemInfo.part_ismn_standalone == '0' && !(bibinfo.part_no || bibinfo.part_name || bibinfo.part_year || bibinfo.part_volume)) return false;
            return true;
        } else if (j == 5 && bibinfo.isbn) {
            // OTHER ISBN
            var isbnBib: any = bibinfo.isbn.split(' ')[0];
            isbnBib = toEan(isbnBib);
            var ean_other_length: number = 0;
            if (itemInfo.ean13_other) ean_other_length = itemInfo.ean13_other.length;
            for (var i: number = 0; i < ean_other_length; i++) {
                var item = itemInfo.ean13_other[i];
                if (!isbnBib || !item) return false;
                if (isbnBib != item) return false;
                if (itemInfo.part_root == '0' && itemInfo.part_ean13_standalone == '0' && !(bibinfo.part_no || bibinfo.part_name || bibinfo.part_year || bibinfo.part_volume)) return false;
                return true;
            }
        }
    }
}

module.exports = {
    server: server,
    getPerms: Permissions.getPerms
}

function testLog(color, message) {
    console.log('\x1b[' + color + 'm', message, '\x1b[0m'); //debug
}
