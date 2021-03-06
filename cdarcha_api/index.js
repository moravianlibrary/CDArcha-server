"use strict";
// @ts-ignore
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
// ====================== CONFIG.TS ===================
var apiVersion = "1.0";
// nacteni konfigurace
var dotenv = require('dotenv');
dotenv.config({ path: '.env' });
// url na backend
var urlMain = process.env.BASE_DOMAIN;
var urlPart = "/";
var apiImport = "api/import";
var urlUpload = "file/upload";
var urlCoverUpload = "file/coverupload";
var apiChecksum = "api/gethash";
var apiGetMedia = "api/getmedia";
var apiGetAllMediaList = "api/getallmedialist";
var apiCloseArchive = "api/closearchive";
var urlMetadata = "api/media";
var urlWeb = "cdarcha";
var urlParams = "?books=";
var urlStorage = "storage/";
var uriAlive = "runtime/alive";
// kolekce s metadaty tak jak je pojmenovana v mongodb
var metaCollection = "biblio";
var archiveCollection = "archive";
var mediaCollection = "media";
var filesCollection = "files";
var usersCollection = "users";
// temporary files
//const tmpFolder: string = "/home/cdarcha/cdarcha/tmp";
var tmpFolder = process.env.TMP_DIR;
var storageFolder = process.env.STORAGE_DIR;
// =========================================
var request = require('request');
var toEan = require('./to-ean').toEan;
var partParser = require('./book-part-parser');
var URL_lib = require('url');
var fs = require('fs');
var md5 = require('md5');
var http = require('http');
var mongo = require('mongodb');
var crypto = require('crypto');
var httpProxy = require('http-proxy');
var multipart = require('parse-multipart');
var xmlFormatter = require('xml-formatter');
var proxy = httpProxy.createProxyServer();
var etags = {}; // obsahuje vsechny platne etag pro cache prohlizec
var Bibinfo_1 = require("./Bibinfo");
var Archive_1 = require("./Archive");
var Media_1 = require("./Media");
var Files_1 = require("./Files");
var Statistics_1 = require("./Statistics");
var Permissions_1 = require("./Permissions");
var Helpers_1 = require("./Helpers");
var statusHuman = {
    0: 'Rozpracované na klientovi',
    1: 'Ukončené na klientovi',
    2: 'Rozpracované na serveru',
    3: 'připravené na archivaci',
    4: 'Archivované',
    5: 'Timeout analýzy média (DROID)',
    6: 'Jiný problém s analýzou média (DROID)'
};
var subdirByPrefix = {
    'amd': 'amdsec/',
    'dmd': 'dmdsec/',
    'mcs': 'mastercopyscan/',
    'ucs': 'usercopyscan/'
};
// ====================== CD ARCHA API ===================
var server = function (req, response, db) {
    var a = new Server(req, response, db);
    a.go(a);
};
var Server = /** @class */ (function () {
    function Server(req, response, db) {
        this.requrl = req.url;
        testLog("33", "CD ARCHA v" + apiVersion + " starting...");
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
        this.sigla = Permissions_1.Permissions.refererValid(this.referer, this.remoteIP, this.encsigla);
    }
    Server.prototype.go = function (s) {
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
            var sigla = Permissions_1.Permissions.refererValid(this.referer, this.remoteIP, this.encsigla);
            var etagPrefix = this.etag.substring(0, 4);
            Statistics_1.Statistics.addEtagStatisticByEtagPrefix(etagPrefix, sigla);
            this.response.statusCode = 304;
            this.response.end();
        }
        /**
         * STATICKE SOUBORY
         **/
        // http://cdarcha.mzk.cz/favicon.ico
        else if (this.requrl === '/favicon.ico' || this.requrl === '/cdarcha_klient/update-info.xml' || this.requrl === '/cdarcha_klient/CDArcha_klient_setup.exe' || this.requrl === '/cdarcha_klient/CDArcha_klient_setupNoAdmin.exe') {
            testLog("41", "[STATICKE SUBORY] Sigla:" + sigla);
            Statistics_1.Statistics.addFileRequests(sigla);
            testLog("41", "-> fileRequests[sigla]:" + Statistics_1.Statistics.fileRequests[sigla]);
            if (this.requrl.substring(this.requrl.length - 4) === '.ico')
                this.response.writeHead(200, { 'Etag': 'file-' + md5(this.requrl), 'Content-Type': 'image/x-icon' });
            if (this.requrl.substring(this.requrl.length - 2) === '.js')
                this.response.writeHead(200, { 'Etag': 'file-' + md5(this.requrl), 'Content-Type': 'text/javascript' });
            else
                this.response.writeHead(200, { 'Etag': 'file-' + md5(this.requrl) });
            etags['file-' + md5(this.requrl)] = null;
            var readStream = fs.createReadStream('static' + this.requrl);
            readStream.pipe(this.response);
        }
        /**
         * LET'S ENCRYPT CHALLENGE
         **/
        else if (this.requrl.substr(0, 12) === '/.well-known') {
            testLog("41", "[LETS ENCRYPT]");
            var fileName = this.requrl.substr(13);
            if (fs.existsSync(fileName)) {
                var readStream = fs.createReadStream(fileName);
                readStream.pipe(this.response);
            }
            else {
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
                var boundary = multipart.getBoundary(this.req.headers['content-type']);
                Helpers_1.Helpers.checkApiLogin(s.db, this.query.login, this.query.password, this.query.version, apiVersion, function (resApiLogin, user) {
                    if (resApiLogin) {
                        s.response.writeHead(resApiLogin);
                        s.response.end();
                        return;
                    }
                    var body = '';
                    s.req.on('data', function (chunk) {
                        body += chunk;
                    });
                    s.req.on('end', function () {
                        testLog("41", "[ CHUNK FINISHED ]");
                        body = new Buffer(body, 'utf-8');
                        var res = 0;
                        console.log(body);
                        var parts = multipart.Parse(body, boundary);
                        var bibinfo = {};
                        var archive = {};
                        var media = {};
                        var metaxml;
                        var marcxml;
                        var mods;
                        for (var i = 0; i < parts.length; i++) {
                            var key = parts[i]['filename'];
                            var value = parts[i]['data'].toString('utf8');
                            console.log(key + '=' + value);
                            if (key == 'isbn')
                                key = 'ean13';
                            if (key == 'part_isbn')
                                key = 'part_ean13';
                            if (key == 'meta.xml') {
                                metaxml = value;
                                continue;
                            }
                            if (key == 'marcxml.xml') {
                                marcxml = value;
                                continue;
                            }
                            if (key == 'mods.xml') {
                                mods = value;
                                continue;
                            }
                            if (key == 'media_no') {
                                media.mediaNo = value;
                            }
                            bibinfo[key] = value;
                        }
                        /*************************************
                         * Vyhladat a vytvorit BIBLIO zaznam
                         ************************************/
                        Bibinfo_1.Bibinfo.searchAndCreate(s, bibinfo, function (biblio) {
                            // Vyhladaj BIBLIO zaznam, a v pripade ak neexistuje vytvor
                            var idBiblio;
                            console.dir(biblio);
                            console.log('^^^^^^^^^^^^^^^^^ BIBLIO ^^^^^^^^^^^^^^');
                            if (!biblio) {
                                var err = 'Bibinfo search and create failed';
                                console.log(err);
                                s.send404IfNotValue(res, err);
                                return false;
                            }
                            else {
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
                            Archive_1.Archive.searchOpenAndCreate(s, archive, function (archiveItems) {
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
                                var archiveDir = storageFolder + '/' + uuid;
                                if (!fs.existsSync(archiveDir)) {
                                    fs.mkdirSync(archiveDir);
                                    fs.mkdirSync(archiveDir + '/data');
                                }
                                archiveDir = archiveDir + '/data';
                                /*************************************
                                 * Vyhladat a vytvorit zaznam MEDIA
                                 ************************************/
                                media.archive = idArchive;
                                Media_1.Media.searchAndCreate(s, media, function (mediaItems) {
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
                                    var dmdDir = archiveDir + '/dmdsec';
                                    if (!fs.existsSync(dmdDir)) {
                                        fs.mkdirSync(dmdDir);
                                    }
                                    // vytvorime adresar administracnich metadat AMDSEC, pokud jeste neexistuje
                                    var amdDir = archiveDir + '/amdsec';
                                    if (!fs.existsSync(amdDir)) {
                                        fs.mkdirSync(amdDir);
                                    }
                                    var filename, filenameFull;
                                    // META.xml - for each media
                                    if (metaxml.length) {
                                        filename = 'amd_mets_isoimg_' + idMedia + '.xml';
                                        filenameFull = amdDir + '/' + filename;
                                        (function (filename, filenameFull) {
                                            // files data to be writen to DB
                                            var fileinfo = {};
                                            fileinfo.fileName = filename;
                                            fileinfo.fileType = 'amdsec-media-meta';
                                            fileinfo.fileSize = metaxml.length;
                                            fileinfo.checkSum = crypto.createHash('md5').update(metaxml, 'utf8').digest('hex');
                                            fileinfo.media = idMedia;
                                            Files_1.Files.searchAndCreate(s, fileinfo, function (fileDoc) {
                                                // write file to storage
                                                fs.writeFileSync(filenameFull, metaxml);
                                            });
                                        }(filename, filenameFull));
                                    }
                                    // MARC.xml - for easinglech archive
                                    if (marcxml.length) {
                                        filename = 'dmd_marc_' + idArchive + '.xml';
                                        filenameFull = dmdDir + '/' + filename;
                                        (function (filename, filenameFull) {
                                            // files data to be writen to DB
                                            var fileinfo = {};
                                            fileinfo.fileName = filename;
                                            fileinfo.fileType = 'dmdsec-archive-marc';
                                            fileinfo.fileSize = marcxml.length;
                                            fileinfo.checkSum = crypto.createHash('md5').update(marcxml, 'utf8').digest('hex');
                                            fileinfo.archive = idArchive;
                                            Files_1.Files.searchAndCreate(s, fileinfo, function (fileDoc) {
                                                // write file to storage
                                                fs.writeFileSync(filenameFull, marcxml);
                                            });
                                        }(filename, filenameFull));
                                    }
                                    // MODS.xml - for single archive
                                    if (mods.length) {
                                        filename = 'dmd_mods_' + uuid + '.xml';
                                        filenameFull = dmdDir + '/' + filename;
                                        (function (filename, filenameFull) {
                                            // files data to be writen to DB
                                            var fileinfo = {};
                                            fileinfo.fileName = filename;
                                            fileinfo.fileType = 'dmdsec-archive-mods';
                                            fileinfo.fileSize = mods.length;
                                            fileinfo.checkSum = crypto.createHash('md5').update(mods, 'utf8').digest('hex');
                                            fileinfo.archive = idArchive;
                                            Files_1.Files.searchAndCreate(s, fileinfo, function (fileDoc) {
                                                // write file to storage
                                                var modsFormatted = xmlFormatter(mods, { indentation: "\t", stripComments: true });
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
            }
            else {
                s.send404IfNotValue(false, 'POST method required');
            }
        } // API IMPORT
        /**
         * ISO FILE UPLOAD
         **/
        else if (this.requrl.indexOf(urlUpload) > 0) {
            testLog("41", "[ RECEIVING CHUNK ]");
            if (this.req.method == 'POST') {
                testLog("41", "POST");
                var mediaId = this.req.headers['x-cdarcha-mediaid'];
                var mediaChecksum = this.req.headers['x-cdarcha-checksum'];
                var fileType = this.req.headers['x-cdarcha-filetype'] || 'iso';
                var quickId = this.req.headers['x-cdarcha-quickid'] || '';
                var mediaSize = parseInt(this.req.headers['x-cdarcha-mediasize']) || 0;
                var mediaReadProblem = parseInt(this.req.headers['x-cdarcha-mediareadproblem']) || 0;
                var forcedUpload = parseInt(this.req.headers['x-cdarcha-forcedupload']) || 0;
                // mediaid a checksum je povinne
                if (!mediaId || !mediaChecksum) {
                    s.response.writeHead(404);
                    s.response.end('mediaid or checksum missing');
                    return;
                }
                var hash = crypto.createHash('md5');
                hash.setEncoding('hex');
                var writeStream = fs.createWriteStream(tmpFolder + '/iso/' + mediaId + '.iso', { flags: 'w' });
                this.req.pipe(writeStream, { end: false });
                this.req.pipe(hash);
                this.req.on('end', function () {
                    testLog("41", "[ CHUNK FINISHED ]");
                    writeStream.end();
                    hash.end();
                    var checksum = hash.read();
                    console.log('%%%%%%%');
                    console.log(mediaChecksum);
                    console.log(checksum);
                    console.log('%%%%%%%');
                    var success = (mediaChecksum == checksum);
                    var mediaFile = {
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
                        s.db.collection(mediaCollection).findOne({ _id: new mongo.ObjectID(mediaId) }, function (err, mediaItem) {
                            if (err) {
                                console.log(err);
                                s.send404IfNotValue(null, err);
                                return false;
                            }
                            var archiveId = mediaItem.archive;
                            s.db.collection(mediaCollection).update({ _id: new mongo.ObjectID(mediaId) }, { $set: mediaFile });
                            s.db.collection(archiveCollection).findOne({ _id: new mongo.ObjectID(archiveId) }, function (err, archive) {
                                if (err) {
                                    console.log(err);
                                    s.send404IfNotValue(null, err);
                                    return false;
                                }
                                // vytvorime adresar archivu, pokud jeste neexistuje
                                var archiveDir = storageFolder + '/' + archive.uuid;
                                if (!fs.existsSync(archiveDir)) {
                                    fs.mkdirSync(archiveDir);
                                    fs.mkdirSync(archiveDir + '/data');
                                }
                                archiveDir = archiveDir + '/data';
                                // vytvorime adresar media, pokud jeste neexistuje
                                var masterCopyDir = archiveDir + '/isoimage';
                                if (!fs.existsSync(masterCopyDir)) {
                                    fs.mkdirSync(masterCopyDir);
                                }
                                // uklidime docasny soubor
                                fs.copyFileSync(tmpFolder + '/iso/' + mediaId + '.iso', masterCopyDir + '/' + mediaId + '.' + fileType);
                                fs.unlinkSync(tmpFolder + '/iso/' + mediaId + '.iso');
                            });
                        });
                    }
                    else {
                        // kontrolni soucet nesedi, upload se nepoved, uklidime docasny soubor
                        //fs.unlinkSync(tmpFolder + '/iso/' + mediaId + '.iso');
                    }
                    s.response.writeHead(200);
                    s.response.end('ok');
                });
            }
            else {
                this.send404IfNotValue(false, 'POST method required');
            }
        } // ISO FILE UPLOAD
        /**
         * COVER/TOC UPLOAD
         **/
        else if (this.requrl.indexOf(urlCoverUpload) > 0) {
            testLog("41", "[ API COVER UPLOAD ]");
            if (this.req.method == 'POST') {
                var boundary_1 = multipart.getBoundary(this.req.headers['content-type']);
                var boundaryRe_1 = new RegExp(boundary_1, 'g');
                var body = '', writeStream = null; // for streamed file write
                this.req.on('data', function (chunk) {
                    var chunkString = chunk.toString();
                    // indicates that next chunk will be octet stream
                    if (chunkString.match(/Content\-Type\: image\/tif/)) {
                        var fileNameArray = chunkString.match(/filename=\"(.*)\"/);
                        var fileName_1 = fileNameArray[1];
                        // finish octet stream if any (when transfering toc_2 after toc_1 after cover, ...)
                        if (writeStream) {
                            writeStream.end();
                            writeStream = null;
                        }
                        ;
                        if (!writeStream && fileName_1) {
                            // starting with incomming file stream
                            writeStream = fs.createWriteStream(tmpFolder + '/scan/' + boundary_1 + '-' + fileName_1, { flags: 'a' });
                        }
                        // text form data - octet stream form data header
                        body += chunk;
                    }
                    else if (writeStream) {
                        // continuing or ending octet stream
                        if (chunkString.match(boundaryRe_1)) {
                            // end of octet stream
                            writeStream.end();
                            // text form data
                            body += chunk;
                        }
                        else if (writeStream._writableState.ended == false) {
                            // continuing octet stream - write chunk to the file
                            writeStream.write(chunk);
                        }
                    }
                    else {
                        // text form data
                        body += chunk;
                    }
                });
                this.req.on('end', function () {
                    testLog("41", "[ CHUNK COVER UPLOAD FINISHED ]");
                    body = new Buffer(body, 'utf-8');
                    var parts = multipart.Parse(body, boundary_1);
                    var metaxml = '';
                    // media_id
                    var id = null;
                    for (var i = 0; i < parts.length; i++) {
                        var key = parts[i]['filename'];
                        var value = parts[i]['data'].toString('utf8');
                        if (key == 'id') {
                            id = value;
                            var idMatches = id.match(/[a-fA-F0-9]+/g);
                            if (idMatches && idMatches[0]) {
                                id = idMatches[0];
                            }
                        }
                        else if (key == 'meta.xml') {
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
                    (function (id, metaxml) {
                        s.db.collection(mediaCollection).findOne({ _id: new mongo.ObjectID(id) }, function (err, mediaDoc) {
                            if (err) {
                                console.dir(err);
                                s.response.writeHead(404);
                                s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                                return;
                            }
                            var archiveId;
                            if (mediaDoc) {
                                archiveId = mediaDoc.archive;
                            }
                            else {
                                archiveId = id;
                            }
                            s.db.collection(archiveCollection).findOne({ _id: new mongo.ObjectID(archiveId) }, function (err, archiveDoc) {
                                if (err) {
                                    console.dir(err);
                                    s.response.writeHead(404);
                                    s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                                    return;
                                }
                                var archiveUuid = archiveDoc.uuid;
                                var archiveDir = storageFolder + '/' + archiveUuid;
                                // search for cover+toc in form data
                                for (var i = 0; i < parts.length; i++) {
                                    (function (part) {
                                        var filename = part['filename'];
                                        // process octet stream = cover+toc
                                        var filenamePrefix9 = filename.substring(0, 9);
                                        var filenameFull = tmpFolder + '/scan/' + boundary_1 + '-' + filename;
                                        if (filenamePrefix9 == 'cover.tif' || filenamePrefix9 == 'toc_page_') {
                                            // open file to get md5 hash
                                            fs.readFile(filenameFull, function (err, fileData) {
                                                if (err) {
                                                    console.dir(err);
                                                    s.response.writeHead(404);
                                                    s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                                                    return;
                                                }
                                                // get file size
                                                var stats = fs.statSync(filenameFull);
                                                var fileSizeInBytes = stats.size;
                                                // files data to be writen to DB
                                                var fileinfo = {};
                                                fileinfo.fileName = id + '-' + filename;
                                                fileinfo.fileType = (filenamePrefix9 == 'cover.tif' ? 'cover' : 'toc');
                                                fileinfo.fileSize = fileSizeInBytes;
                                                // get file checksum
                                                fileinfo.checkSum = crypto.createHash('md5').update(fileData, 'utf8').digest('hex');
                                                // archive or media id
                                                if (mediaDoc) {
                                                    fileinfo.media = mediaDoc._id;
                                                }
                                                else if (archiveDoc) {
                                                    fileinfo.archive = archiveDoc._id;
                                                }
                                                // write filedata to debug
                                                Files_1.Files.insertUnique(s, fileinfo, function (result) {
                                                    if (!fs.existsSync(archiveDir)) {
                                                        fs.mkdirSync(archiveDir);
                                                        fs.mkdirSync(archiveDir + '/data');
                                                    }
                                                    var masterCopyDir = archiveDir + '/data/mastercopyscan';
                                                    if (!fs.existsSync(masterCopyDir)) {
                                                        fs.mkdirSync(masterCopyDir);
                                                    }
                                                    // cleanup uploaded file
                                                    fs.copyFileSync(filenameFull, masterCopyDir + '/' + (mediaDoc ? mediaDoc._id : archiveDoc._id) + '-' + filename);
                                                    fs.unlinkSync(filenameFull);
                                                    var amdDir = archiveDir + '/data/amdsec';
                                                    if (!fs.existsSync(amdDir)) {
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
                                                        var filenameDotParts = filename.split('.');
                                                        var filenameWoExtension = filenameDotParts[0];
                                                        var filenameMetaXml = 'amd_mets_' + (mediaDoc ? mediaDoc._id : archiveDoc._id) + '-' + filenameWoExtension + '.xml';
                                                        var filenameFullMetaXml = amdDir + '/' + filenameMetaXml;
                                                        (function (filenameFullMetaXml, scanFileId) {
                                                            // files data to be writen to DB
                                                            var fileinfo = {};
                                                            fileinfo.parent = scanFileId;
                                                            fileinfo.fileName = filenameMetaXml;
                                                            fileinfo.fileType = 'amdsec-scan-meta-' + result.fileType;
                                                            fileinfo.fileSize = metaxml.length;
                                                            fileinfo.checkSum = crypto.createHash('md5').update(metaxml, 'utf8').digest('hex');
                                                            if (mediaDoc) {
                                                                fileinfo.media = mediaDoc._id;
                                                            }
                                                            else {
                                                                fileinfo.archive = archiveDoc._id;
                                                            }
                                                            Files_1.Files.insertUnique(s, fileinfo, function () {
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
            }
            else {
                s.send404IfNotValue(false, 'POST method required');
            }
        } // COVER/TOC UPLOAD
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
            s.db.collection(mediaCollection).findOne({ _id: new mongo.ObjectID(this.query.mediaid) }, function (err, item) {
                if (err) {
                    s.response.writeHead(404);
                    s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                    return;
                }
                if (!item) {
                    s.response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                    s.response.end(JSON.stringify({ "status": "not found" }));
                    return;
                }
                if (!item.checkSum) {
                    s.response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                    s.response.end(JSON.stringify({ "status": "not prepared" }));
                }
                else {
                    s.response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                    s.response.end(JSON.stringify({ "status": "ok", "hash": item.checkSum }));
                }
            });
        } // API GET HASH
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
            s.db.collection(mediaCollection).findOne({ 'quickId': this.query.quickid }, function (err, media) {
                if (err) {
                    s.response.writeHead(404);
                    s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                    return;
                }
                if (!media) {
                    s.response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
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
                        s.response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
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
                            s.response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                            s.response.end(JSON.stringify({ "status": "biblio not found" }));
                            return;
                        }
                        s.response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                        var dtLastUpdate = null;
                        if (media.dtLastUpdate) {
                            if (typeof media.dtLastUpdate == 'string') {
                                dtLastUpdate = new Date(media.dtLastUpdate);
                            }
                            else {
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
        } // API GET MEDIA
        /**
         * API GET ALL MEDIA
         * Vylistuje vsechny archivy a media k danemu bibliografickemu zaznamu
         **/
        else if (this.requrl.indexOf(apiGetAllMediaList) > 0) {
            testLog("41", "[ API GET ALL MEDIA LIST ]");
            Helpers_1.Helpers.checkApiLogin(s.db, this.query.login, this.query.password, this.query.version, apiVersion, function (resApiLogin) {
                if (resApiLogin) {
                    s.response.writeHead(resApiLogin);
                    s.response.end();
                    return;
                }
                else if (s.req.method == 'POST') {
                    testLog("41", "POST");
                    var boundary = multipart.getBoundary(s.req.headers['content-type']);
                    var body = '';
                    s.req.on('data', function (chunk) {
                        body += chunk;
                    });
                    s.req.on('end', function () {
                        testLog("41", "[ CHUNK FINISHED ]");
                        body = new Buffer(body, 'utf-8');
                        var parts = multipart.Parse(body, boundary);
                        var bibinfo = {};
                        for (var i = 0; i < parts.length; i++) {
                            var key = parts[i]['filename'];
                            if (key == 'isbn')
                                key = 'ean13';
                            if (key == 'ean13' || key == 'ismn' || key == 'oclc' || key == 'nbn' || key == 'uuid' || key == 'title' || key == 'authors' || key == 'year' || key.slice(0, 5) == 'part_') {
                                bibinfo[key] = parts[i]['data'].toString('utf8');
                            }
                        }
                        /*************************************
                         * Vyhladat a vytvorit BIBLIO zaznam
                         ************************************/
                        Bibinfo_1.Bibinfo.search(s, bibinfo, function (biblio) {
                            // Vyhladaj BIBLIO zaznam
                            var idBiblio;
                            if (!biblio) {
                                s.response.writeHead(200);
                                s.response.end();
                                return false;
                            }
                            else {
                                idBiblio = biblio._id;
                            }
                            s.db.collection(archiveCollection).findOne({ biblio: idBiblio }, function (err, archive) {
                                // Vyhladaj ARCHIVE zaznam
                                var idArchive;
                                if (!archive) {
                                    s.response.writeHead(200);
                                    s.response.end();
                                    return false;
                                }
                                else {
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
                                    'text': 'Archiv:   ' + idArchive + '   (' + archiveDate.getDate() + '.' + (archiveDate.getMonth() + 1) + '.' + archiveDate.getFullYear() + ')'
                                });
                                s.db.collection(mediaCollection).find({ archive: idArchive }).sort({ mediaNo: 1 }).toArray(function (err, media) {
                                    // Vyhladaj MEDIA zaznam
                                    if (media && media.length) {
                                        for (var i = 0; i < media.length; i++) {
                                            var item = media[i];
                                            var mediaDate = new Date(item.dtLastUpdate);
                                            out.push({
                                                'id': item._id,
                                                'type': 'media',
                                                'mediaNo': item.mediaNo,
                                                'status': null,
                                                'dtLastUpdate': item.dtLastUpdate,
                                                'text': 'Médium:   ' + item.mediaNo + '   (' + mediaDate.getDate() + '.' + (mediaDate.getMonth() + 1) + '.' + mediaDate.getFullYear() + ')'
                                            });
                                        }
                                    }
                                    s.response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                                    s.response.end(JSON.stringify(out));
                                });
                            });
                        });
                    });
                }
            });
        } // API GET ALL MEDIA
        /**
         * API CLOSE ARCHIVE
         * Close archive record
         **/
        else if (this.requrl.indexOf(apiCloseArchive) > 0) {
            testLog("41", "[ API CLOSE ARCHIVE ]");
            var id_1 = this.query.id;
            if (!id_1) {
                s.response.writeHead(404);
                s.response.end(JSON.stringify({ "status": "id missing" }));
                return;
            }
            s.db.collection(archiveCollection).findOne({ _id: new mongo.ObjectID(id_1) }, function (err, archiveDoc) {
                if (err) {
                    console.dir(err);
                    s.response.writeHead(404);
                    s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                    return;
                }
                s.db.collection(mediaCollection).findOne({ _id: new mongo.ObjectID(id_1) }, function (err, mediaDoc) {
                    if (err) {
                        console.dir(err);
                        s.response.writeHead(404);
                        s.response.end(JSON.stringify({ "status": "error", "msg": err }));
                        return;
                    }
                    var archiveId = archiveDoc ? id_1 : mediaDoc.archive;
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
            var reqUrl = this.requrl.split('?')[0];
            var file = storageFolder + '/' + reqUrl.substring(urlStorage.length + 1);
            testLog("41", "-> reqUrl:" + reqUrl);
            if (fs.existsSync(file)) {
                if ((this.requrl.indexOf('.iso')) > 0) {
                    s.response.writeHead(200, { 'Content-Type': 'application/iso' });
                }
                else {
                    s.response.writeHead(200, { 'Content-Type': 'text/xml' });
                }
                var readStream = fs.createReadStream(file);
                readStream.pipe(this.response);
            }
            else {
                s.send404IfNotValue(null, 'No such file in storage.');
            }
        }
        /**
         * METADATA
         **/
        // https://cdarcha.mzk.cz/api/media/?multi=[{%22isbn%22:%229788376663103%22},{%22isbn%22:%229788376663203%22}]
        else if ((this.requrl.indexOf(urlMetadata)) > 0) {
            var json = [], multis = [];
            // podpora dotazu na jeden zaznam
            if (!this.query.multi) {
                var multi = {};
                for (var queryKey in this.query) {
                    switch (queryKey) {
                        case 'isbn':
                        case 'ean':
                            multi[queryKey] = this.query.isbn;
                            break;
                        case 'nbn':
                            multi[queryKey] = this.query.nbn;
                            break;
                        case 'ismn':
                            multi[queryKey] = this.query.ismn;
                            break;
                        case 'oclc':
                            multi[queryKey] = this.query.oclc;
                            break;
                        case 'uuid':
                            multi[queryKey] = this.query.uuid;
                            break;
                        case 'sysno':
                            multi[queryKey] = this.query.sysno;
                            break;
                        case 'sigla':
                            multi[queryKey] = this.query.sigla;
                            break;
                    }
                }
                multis.push(multi);
            }
            else {
                try {
                    multis = JSON.parse(decodeURIComponent(this.query.multi));
                }
                catch (err) {
                    this.send404IfNotValue(false, 'Check query syntax');
                    return;
                }
            }
            (function () {
                return __awaiter(this, void 0, void 0, function () {
                    var i, multi, queryBiblio, queryArchive, queryKey, isbn, ean, archive, biblio, item, creator, uuid, cursorFileArchive, fileArchive, cursorMedia, media, itemMediaFiles, cursorFilesMedia, fileMedia, fileExt;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                i = 0;
                                _a.label = 1;
                            case 1:
                                if (!(i < multis.length)) return [3 /*break*/, 24];
                                multi = multis[i], queryBiblio = [], queryArchive = null;
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
                                    for (queryKey in multi) {
                                        if (queryKey == 'isbn' || queryKey == 'ean') {
                                            isbn = queryKey == 'isbn' ? multi.isbn : multi.ean;
                                            isbn = isbn.split(' ')[0];
                                            if (isbn.length) {
                                                ean = toEan(isbn);
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
                                archive = null, biblio = null, item = {};
                                if (!queryArchive) return [3 /*break*/, 3];
                                return [4 /*yield*/, s.db.collection(archiveCollection).findOne(queryArchive)];
                            case 2:
                                archive = _a.sent();
                                return [3 /*break*/, 5];
                            case 3:
                                if (!queryBiblio.length) return [3 /*break*/, 5];
                                return [4 /*yield*/, s.db.collection(metaCollection).findOne({ $or: queryBiblio })];
                            case 4:
                                biblio = _a.sent();
                                _a.label = 5;
                            case 5:
                                if (!(archive || biblio)) return [3 /*break*/, 22];
                                if (!archive) return [3 /*break*/, 7];
                                return [4 /*yield*/, s.db.collection(metaCollection).findOne({ _id: archive.biblio })];
                            case 6:
                                biblio = _a.sent();
                                return [3 /*break*/, 9];
                            case 7: return [4 /*yield*/, s.db.collection(archiveCollection).findOne({ biblio: biblio._id })];
                            case 8:
                                archive = _a.sent();
                                _a.label = 9;
                            case 9: return [4 /*yield*/, s.db.collection(usersCollection).findOne({ _id: archive.creator })];
                            case 10:
                                creator = _a.sent();
                                uuid = archive.uuid;
                                item.uuid = uuid;
                                item.status = archive.status;
                                item.statusHuman = statusHuman[archive.status];
                                item.dtCreated = new Date(archive.dtCreated).toISOString();
                                item.dtLastUpdate = new Date(archive.dtLastUpdate).toISOString();
                                item.creatorSigla = creator.sigla;
                                if (biblio.ean13)
                                    item.ean13 = biblio.ean13;
                                if (biblio.ismn)
                                    item.ismn = biblio.ismn;
                                if (biblio.nbn)
                                    item.nbn = biblio.nbn;
                                if (biblio.oclc)
                                    item.oclc = biblio.oclc;
                                if (biblio.sigla)
                                    item.sigla = biblio.sigla;
                                if (biblio.sysno)
                                    item.sysno = biblio.sysno;
                                if (biblio.title)
                                    item.title = biblio.title;
                                if (biblio.authors)
                                    item.authors = biblio.authors;
                                if (biblio.year)
                                    item.year = biblio.year;
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
                                cursorFileArchive = s.db.collection(filesCollection).find({ archive: archive._id });
                                _a.label = 11;
                            case 11: return [4 /*yield*/, cursorFileArchive.hasNext()];
                            case 12:
                                if (!_a.sent()) return [3 /*break*/, 22];
                                return [4 /*yield*/, cursorFileArchive.next()];
                            case 13:
                                fileArchive = _a.sent();
                                // reprezentativni obalka
                                if (fileArchive.fileType == 'cover') {
                                    item.coverMasterCopy = 'data/' + subdirByPrefix[fileArchive.fileName.substring(0, 3)] + fileArchive.fileName;
                                    // usercopy reprezentativni obalka
                                    if (fs.existsSync(storageFolder + '/' + uuid + '/data/usercopyscan/' + fileArchive.fileName.replace('mcs_', 'ucs_')))
                                        item.coverUserCopy = 'data/usercopyscan/' + fileArchive.fileName;
                                }
                                // reprezentativni toc
                                else if (fileArchive.fileType == 'toc') {
                                    item.toc = 'data/' + subdirByPrefix[fileArchive.fileName.substring(0, 3)] + fileArchive.fileName;
                                    // usercopy reprezentativni toc
                                    if (fs.existsSync(storageFolder + '/' + uuid + +'/data/usercopyscan/' + fileArchive.fileName.replace('mcs_', 'ucs_')))
                                        item.tocUserCopy = 'data/usercopyscan/' + fileArchive.fileName;
                                }
                                // jiny typ souboru napr. mods
                                else {
                                    item.files.push({
                                        fileName: 'data/' + subdirByPrefix[fileArchive.fileName.substring(0, 3)] + fileArchive.fileName,
                                        fileType: fileArchive.fileType
                                    });
                                }
                                // media archivu
                                item.media = [];
                                cursorMedia = s.db.collection(mediaCollection).find({ archive: archive._id });
                                _a.label = 14;
                            case 14: return [4 /*yield*/, cursorMedia.hasNext()];
                            case 15:
                                if (!_a.sent()) return [3 /*break*/, 21];
                                return [4 /*yield*/, cursorMedia.next()];
                            case 16:
                                media = _a.sent();
                                itemMediaFiles = [];
                                cursorFilesMedia = s.db.collection(filesCollection).find({ media: media._id });
                                _a.label = 17;
                            case 17: return [4 /*yield*/, cursorFilesMedia.hasNext()];
                            case 18:
                                if (!_a.sent()) return [3 /*break*/, 20];
                                return [4 /*yield*/, cursorFilesMedia.next()];
                            case 19:
                                fileMedia = _a.sent();
                                itemMediaFiles.push({
                                    fileName: 'data/' + subdirByPrefix[fileMedia.fileName.substring(0, 3)] + fileMedia.fileName,
                                    fileType: fileMedia.fileType
                                });
                                // abbyy soubory
                                if (fileMedia.fileName.substring(0, 3) == 'mcs') {
                                    fileExt = fileMedia.fileName.slice(-4);
                                    if (fs.existsSync(storageFolder + '/' + uuid + '/data/mastercopyscan/' + fileMedia.fileName.replace(fileExt, '.txt'))) {
                                        itemMediaFiles.push({
                                            fileName: 'data/' + subdirByPrefix[fileMedia.fileName.substring(0, 3)] + fileMedia.fileName.replace(fileExt, '.txt'),
                                            fileType: fileMedia.fileType + '-ocr-txt'
                                        });
                                    }
                                    if (fs.existsSync(storageFolder + '/' + uuid + '/data/mastercopyscan/' + fileMedia.fileName.replace(fileExt, '.xml'))) {
                                        itemMediaFiles.push({
                                            fileName: 'data/' + subdirByPrefix[fileMedia.fileName.substring(0, 3)] + fileMedia.fileName.replace(fileExt, '.xml'),
                                            fileType: fileMedia.fileType + '-ocr-alto'
                                        });
                                    }
                                }
                                return [3 /*break*/, 17];
                            case 20:
                                item.media.push({
                                    mediaNo: media.mediaNo,
                                    fileName: 'data/isoimage/' + media.fileName,
                                    fileType: media.fileType,
                                    fileSize: media.mediaSize,
                                    checksum: media.checksum,
                                    repeatedUpload: media.forcedUpload,
                                    mediaFiles: itemMediaFiles
                                });
                                return [3 /*break*/, 14];
                            case 21: return [3 /*break*/, 11];
                            case 22:
                                json.push(item);
                                _a.label = 23;
                            case 23:
                                i++;
                                return [3 /*break*/, 1];
                            case 24:
                                s.response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                                s.response.end(JSON.stringify(json, null, ' '));
                                return [2 /*return*/];
                        }
                    });
                });
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
    };
    //ak posle vrati true, ak neposle vrati false
    Server.prototype.send404IfNotValue = function (value, message) {
        if (message === void 0) { message = undefined; }
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
    };
    Server.prototype.getItemInfoFromItem = function (item) {
        var itemInfo = {};
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
    };
    Server.prototype.isGoodItemInfoForBibInfo = function (itemInfo, bibinfo) {
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
    };
    Server.prototype.itemFound = function (itemInfo, bibinfo, j) {
        if (j == 0 && bibinfo.isbn) {
            // ISBN
            var isbnBib = bibinfo.isbn.split(' ')[0];
            isbnBib = toEan(isbnBib);
            if (!isbnBib || !itemInfo.ean13)
                return false;
            if (isbnBib != itemInfo.ean13)
                return false;
            if (itemInfo.part_root == '0' && itemInfo.part_ean13_standalone == '0' && !(bibinfo.part_no || bibinfo.part_name || bibinfo.part_year || bibinfo.part_volume))
                return false;
            return true;
        }
        else if (j == 1 && bibinfo.nbn) {
            // NBN
            if (!bibinfo.nbn || !itemInfo.nbn)
                return false;
            if (bibinfo.nbn != itemInfo.nbn)
                return false;
            if (itemInfo.part_root == '0' && itemInfo.part_nbn_standalone == '0' && !(bibinfo.part_no || bibinfo.part_name || bibinfo.part_year || bibinfo.part_volume))
                return false;
            return true;
        }
        else if (j == 2 && bibinfo.oclc) {
            // OCLC
            if (!bibinfo.oclc || !itemInfo.oclc)
                return false;
            if (bibinfo.oclc != itemInfo.oclc)
                return false;
            if (itemInfo.part_root == '0' && itemInfo.part_oclc_standalone == '0' && !(bibinfo.part_no || bibinfo.part_name || bibinfo.part_year || bibinfo.part_volume))
                return false;
            return true;
        }
        else if (j == 3 && bibinfo.uuid) {
            // UUID
            if (!bibinfo.uuid.length || !itemInfo.uuid)
                return false;
            return (itemInfo.uuid.indexOf(bibinfo.uuid) > -1) ? true : false;
        }
        else if (j == 4 && bibinfo.ismn) {
            // ISMN
            if (!bibinfo.ismn || !itemInfo.ismn)
                return false;
            bibinfo.ismn = bibinfo.ismn;
            if (bibinfo.ismn != itemInfo.ismn)
                return false;
            if (itemInfo.part_root == '0' && itemInfo.part_ismn_standalone == '0' && !(bibinfo.part_no || bibinfo.part_name || bibinfo.part_year || bibinfo.part_volume))
                return false;
            return true;
        }
        else if (j == 5 && bibinfo.isbn) {
            // OTHER ISBN
            var isbnBib = bibinfo.isbn.split(' ')[0];
            isbnBib = toEan(isbnBib);
            var ean_other_length = 0;
            if (itemInfo.ean13_other)
                ean_other_length = itemInfo.ean13_other.length;
            for (var i = 0; i < ean_other_length; i++) {
                var item = itemInfo.ean13_other[i];
                if (!isbnBib || !item)
                    return false;
                if (isbnBib != item)
                    return false;
                if (itemInfo.part_root == '0' && itemInfo.part_ean13_standalone == '0' && !(bibinfo.part_no || bibinfo.part_name || bibinfo.part_year || bibinfo.part_volume))
                    return false;
                return true;
            }
        }
    };
    Server.placeholderData = [
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x0A, 0x00, 0x01, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x4C, 0x01, 0x00, 0x3B
    ];
    Server.placeholder = Buffer.from(Server.placeholderData);
    return Server;
}());
module.exports = {
    server: server,
    getPerms: Permissions_1.Permissions.getPerms
};
function testLog(color, message) {
    console.log('\x1b[' + color + 'm', message, '\x1b[0m'); //debug
}
