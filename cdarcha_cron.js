/// version 1

const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const archiveCollection = 'archive';
const mediaCollection = 'media';
const userCollection = 'users';
const filesCollection = 'files';
const logCollection = 'logcron';
const storageFolder = process.env.STORAGE_DIR;
const abbyyDir = process.env.ABBY_DIR;

// =========================================

const crypto = require('crypto');
const execSync = require('child_process').execSync;
const request = require('request');
const httpd = require('request');
const fs = require('fs');
const md5 = require('md5-file');
const getFolderSize = require('get-folder-size');
const lockFile = require('lockfile');
const querystring = require('querystring');


const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;
const client = new MongoClient(process.env.MONGODB_URI, { useUnifiedTopology: true });


function _log(db, archiveId, msg) {
  db.collection(logCollection).insertOne({ 'dtCreated': Date.now(), 'archive': mongo.ObjectId(archiveId), 'msg': msg });
  console.log(msg);
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


// pouze jeden beh scriptu
lockFile.check('cdarcha_cron.lock', function (er, isLocked) {
if (!isLocked) {

function processOcr(imgFn) {
  return new Promise((resolve, reject) => {
    request({
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.PERO_API_KEY
      },
      uri: 'https://pero-ocr.fit.vutbr.cz/api/post_processing_request',
      method: 'POST',
      body: '{"engine": 1, "images": {"img1": null }}'
    }, function (err, res, body) {
      if (err) reject(err);
      if (res.statusCode != 200) {
        reject('Invalid status code <' + res.statusCode + '>');
      } else {

        // upload file
        const reqJson = JSON.parse(body);
        if (reqJson.status == 'success') {
          const request_id = reqJson.request_id;

          request({
            headers: {
              'accept': 'application/json',
              'Content-Type': 'application/json',
              'api-key': process.env.PERO_API_KEY
            },
            uri: 'https://pero-ocr.fit.vutbr.cz/api/upload_image/' + request_id + '/img1',
            method: 'POST',
            formData: {
              'file': fs.createReadStream(imgFn)
            }
          }, function (err, res, body) {
            if (err) reject(err);
            if (res.statusCode != 200) {
              reject('Invalid status code <' + res.statusCode + '>');
            } else {

              // check status
              const uploadJson = JSON.parse(body);
              if (uploadJson.status == 'success') {
                resolve(request_id);
              }

            }
          })

        } else {
          reject('Failed to create processing request');
        }
      }
    })
  })
}


function processOcrStatus(request_id) {
  return new Promise((resolve, reject) => {
    request({
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.PERO_API_KEY
      },
      uri: 'https://pero-ocr.fit.vutbr.cz/api/request_status/' + request_id,
      method: 'GET'
    }, function (err, res, body) {
      if (err) reject(err);
      if (res.statusCode != 200) {
        reject('Invalid status code <' + res.statusCode + '>');
      } else {
        // check file processing status
        const reqJson = JSON.parse(body);
        if (reqJson.status == 'success') {
          if (reqJson.request_status && reqJson.request_status.img1 && reqJson.request_status.img1.state=='PROCESSED') {
            resolve(true);
          } else {
            resolve(false);
          }
        } else {
          reject('Invalid API status code <' + reqJson.status + '>');
        }
      }
    });
  });
}

function download(uri, imgFn) {
  return new Promise((resolve, reject) => {
    request(
      {
        headers: {
          'api-key': process.env.PERO_API_KEY
        },
        uri: uri,
        method: 'GET'
      }, function (err, res, body) {
        if (err) reject('Error while downloading file from OCR server ' + uri);
      }
    ).pipe(fs.createWriteStream(imgFn)).on('close', function(){
      console.log('[ download done ' + imgFn + ' ]');
      resolve();
    });
  })
}


// proces muze spustit
// pripojime DB a najdeme zaznamy ke zpracovani
client.connect().then((client, err) => {
  if (err) { console.dir(err); return; }
  var db = client.db();

  (async function() {

    try {

      var processedArchives = 0;
      // produkcni
      const cursorArchives = db.collection(archiveCollection).find({ "status": 1, "dtCreated" : { $gte : 1611572545612 } });
      // testovaci - jeden zaznam
      //const cursorArchives = db.collection(archiveCollection).find({ _id: mongo.ObjectId('614019bc8bb0502ae8015dc9') });
      //const cursorArchives = db.collection(archiveCollection).find({ 'uuid': '2e591d30-b914-11ed-993e-29dd9ddd3142' });
      while(await cursorArchives.hasNext()) {
        const archive = await cursorArchives.next();

        var archiveId = archive._id;
        var archiveUuid = archive.uuid;
        var archiveDir = storageFolder + '/' + archiveUuid;
        var archiveDataDir = archiveDir + '/data/';

        _log(db, archiveId, '[ ZACINA ZPRACOVANI ARCHIVU: ' + archive.uuid + ' ]');

        await db.collection(archiveCollection).updateOne({ _id: mongo.ObjectId(archiveId) }, { $set: { status: 2 } });

        // seznam aktualnich nazvu souboru a jejich pozadovany novy nazev
        var renameList = [];

        // date of creation
        var dtCreated = new Date();
        var created = dtCreated.toISOString().substring(0,19);

        // info_UUID.xml
        var infoFile = '', itemlist = '', itemcount = 0;

        // md5_UUID.md5
        var md5File = '', manifestMd5File = '';

        // main_mets_UUID.xml
        var metsFile = '', filesec = '', structlogical = '', structphysical = '';

        // poradove cislo spracovaneho cover
        var coverNo = 0;

        // konecny stav, ktery bude nastaven archivu po skonceni vytvareni baliku
        // 3 = pripravene na archivaci (pokud se vytvareni tohoto SIP baliku neselze)
        // 5 = DROID timeout
        // 6 = DROID nevalidni archiv
        var archiveFinalStatus = 3;

        // init promennych
        var meta = '', coverSeq = '', fileType = '', tmpFileName = '', newFileName = '', execCode = '', usercopyFileName = '', coverChecksum = '', dataAmdMetsIsoimg = '';

        // uzivatel - tvurce archivu
        const user = await db.collection(userCollection).findOne({ '_id': archive.creator });

        infoFile = `<?xml version="1.0" encoding="UTF-8"?><info xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.ndk.cz/standardy-digitalizace/info11.xsd">
      <created>` + created + `</created>
      <metadataversion>1.0</metadataversion>
      <packageid>` + archiveUuid + `</packageid>
      <mainmets>main_mets_` + archiveUuid + `.xml</mainmets>
      <validation version="file_sec:1.0;amd_sec_mix:1.0;physical_map_amd:1.0;amd_file_sec:1.0;monographic_volume:1.0;amd_sec:1.0;monographic_logical_map:1.0;physical_map:1.0">Valid</validation>

      <titleid type="uuid">` + archiveUuid + `</titleid>
      <collection>CDArcha</collection>
      <institution>` + user.institution + `</institution>
      <creator>` + user.sigla + `</creator>
      <size>###archivesize###</size>
      <itemlist itemtotal="###itemtotal###">
          ###itemlist###
      </itemlist>
      <checksum checksum="###md5sum###" type="MD5">md5_` + archiveUuid + `.md5</checksum>
  </info>`;

        metsFile = `<?xml version="1.0" encoding="UTF-8"?>
  <mets:mets xmlns:mets="http://www.loc.gov/METS/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:mods="http://www.loc.gov/mods/v3" xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:premis="info:lc/xmlns/premis-v2" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" LABEL= "Arie vodníka z opery Rusalka, 1908" TYPE="Sound recording" xsi:schemaLocation="http://www.w3.org/2001/XMLSchema-instance http://www.w3.org/2001/XMLSchema.xsd http://www.loc.gov/METS/ http://www.loc.gov/standards/mets/mets.xsd http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-5.xsd http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
    <mets:metsHdr CREATEDATE="2017-07-18T21:39:56" LASTMODDATE="2017-07-29T10:39:56">
      <mets:agent ROLE="CREATOR" TYPE="ORGANIZATION">
        <mets:name>BOA001</mets:name>
      </mets:agent>
      <mets:agent ROLE="ARCHIVIST" TYPE="ORGANIZATION">
        <mets:name>BOA001</mets:name>
      </mets:agent>
    </mets:metsHdr>
    <mets:dmdSec ID="MODSMD_COLLECTION_0001">
      <mets:mdWrap MDTYPE="MODS" MDTYPEVERSION="3.6" MIMETYPE="text/xml">
        <mets:xmlData>
          ###mods###
        </mets:xmlData>
      </mets:mdWrap>
    </mets:dmdSec>
    <mets:fileSec>
  	  ###filesec###
  	</mets:fileSec>
    <mets:structMap LABEL="Logical_Structure" TYPE="LOGICAL">
  	  ###structlogical###
  	</mets:structMap>
  	<mets:structMap LABEL="physical_Structure" TYPE="physical">
      ###structphysical###
  	</mets:structMap>
  </mets:mets>`;

        // pripravit adresar pro usercopy
        var ucsDir = archiveDataDir + 'usercopy';
        if (!fs.existsSync(ucsDir)) {
          // vytvorit pokud neexistuje
          fs.mkdirSync(ucsDir)
        } else {
          // vymazat jeho obsah, pokud existuje
          fs.readdirSync(ucsDir).forEach(function(file, index){
            var curPath = ucsDir + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
              deleteFolderRecursive(curPath);
            } else {
              fs.unlinkSync(curPath);
            }
          });
        }

        // =========================================
        //   COVER - reprezentativny
        // =========================================
        const cursorCover = db.collection(filesCollection).find({ "archive": mongo.ObjectId(archiveId), "fileType": "cover" });
        while(await cursorCover.hasNext()) {
          const cover = await cursorCover.next();

          // nasli sme reprezentativny cover
          coverNo = 1;
          coverSeq = '0001';
          fileType = cover.fileName.split('.');
          _log(db, archiveId, '[ Nalezena reprezentativni obalka archivu - scan cislo: ' + coverSeq + ' ]');

          if (fileType[1] != 'jp2') {
            // transformace na jp2
            tmpFileName = archiveId + '-cover.jp2';
            newFileName = 'mc_' + archiveUuid + '_' + coverSeq + '.jp2';
            _log(db, archiveId, '[ Transformace na JP2: ' + newFileName + ' ]');
            execCode = execSync('bin/convertTIFtoJP2.pl ' + archiveDataDir+'mastercopy/'+cover.fileName + ' ' + archiveDataDir+'mastercopy/'+archiveId+'-cover.jp2');
            fs.unlinkSync(archiveDataDir + 'mastercopy/' + cover.fileName);
          }
          else {
            // toto je docasny nazov suboru - na pozadovany nazev bude prejmenovan az po prejmenovani vsech medii na docasny nazev
            // kvuli tomu, ze se muze sekvencni cislo skrizit
            tmpFileName = archiveId + '-cover.jp2';
            newFileName = 'mc_' + archiveUuid + '_' + coverSeq + '.jp2';
            if (fs.existsSync(archiveDataDir + 'mastercopy/' + cover.fileName)) {
              fs.renameSync(archiveDataDir + 'mastercopy/' + cover.fileName, archiveDataDir + 'mastercopy/' + tmpFileName);
            }
          }

          renameList.push({ '_id': cover._id, 'curr': archiveDataDir + 'mastercopy/' + tmpFileName, 'new': archiveDataDir + 'mastercopy/' + newFileName });
          await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(cover._id) }, { $set: { 'fileName': tmpFileName } });

          // doplnit cover do seznamu md5 a main_mets itemlistu
          coverChecksum = md5.sync(archiveDataDir + 'mastercopy/' + tmpFileName);
          md5File += coverChecksum + ' \\mastercopy\\' + newFileName + "\n";
          manifestMd5File += coverChecksum + ' data/mastercopy/' + newFileName + "\n";
          itemlist += '        <item>\\mastercopy\\' + newFileName + '</item>' + "\n";
          itemcount++;

          //
          // COVER USER COPY 1:8
          //
          usercopyFileName = 'uc_' + archiveUuid + '_' + coverSeq;
          _log(db, archiveId, '[ Transformace na JP2: ' + usercopyFileName + '.jp2 ]');
          execCode = execSync('kdu_transcode -i ' + archiveDataDir+'mastercopy/'+tmpFileName + ' -o ' + archiveDataDir+'usercopy/'+usercopyFileName+'.j2c Corder=RPCL "Cprecincts={256,256},{256,256},{128,128}" ORGtparts=R -rate 3 Clayers=12 "Cmodes={BYPASS}"');
          fs.renameSync(archiveDataDir+'usercopy/'+usercopyFileName+'.j2c', archiveDataDir+'usercopy/'+usercopyFileName+'.jp2');
          // doplnit booklet usercopy 1:8 do seznamu md5 a main_mets itemlistu
          coverChecksum = md5.sync(archiveDataDir + 'usercopy/' + usercopyFileName + '.jp2');
          md5File += coverChecksum + ' \\usercopy\\' + usercopyFileName + '.jp2' + "\n";
          manifestMd5File += coverChecksum + ' data/usercopy/' + usercopyFileName + '.jp2' + "\n";
          itemlist += '        <item>\\usercopy\\' + usercopyFileName + '.jp2' + '</item>' + "\n";
          itemcount++;

          // metadata
          meta = await db.collection(filesCollection).findOne({ "parent": cover._id });
          tmpFileName = 'amd_mets_' + meta._id + '.xml';
          newFileName = 'amd_mets_' + archiveUuid + '_' + coverSeq + '.xml';
          _log(db, archiveId, '[ Mets rezprezentativni obalky: ' + newFileName + ' ]');
          if (fs.existsSync(archiveDataDir + 'amdsec/' + meta.fileName)) {
            dataAmdMetsIsoimg = fs.readFileSync(archiveDataDir + 'amdsec/' + meta.fileName);
            dataAmdMetsIsoimg = dataAmdMetsIsoimg.toString();
            dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###organization###', user.institution);
            dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###uuid###', archiveUuid);
            dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###filename###', archiveDataDir + 'amdsec/' + newFileName);
            fs.writeFileSync(archiveDataDir + 'amdsec/' + meta.fileName, dataAmdMetsIsoimg);
            fs.renameSync(archiveDataDir + 'amdsec/' + meta.fileName, archiveDataDir + 'amdsec/' + tmpFileName);
          }
          renameList.push({ '_id': meta._id, 'curr': archiveDataDir + 'amdsec/' + tmpFileName, 'new': archiveDataDir + 'amdsec/' + newFileName });
          const dataAmdMetsIsoimgMd5 = crypto.createHash('md5').update(dataAmdMetsIsoimg, 'utf8').digest('hex');
          await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(meta._id) }, { $set: { 'fileName': tmpFileName, 'checkSum': dataAmdMetsIsoimgMd5 } });
          md5File += dataAmdMetsIsoimgMd5 + ' \\amdsec\\' + newFileName + "\n";
          manifestMd5File += dataAmdMetsIsoimgMd5 + ' data/amdsec/' + newFileName + "\n";
          itemlist += '        <item>\\amdsec\\' + newFileName + '</item>' + "\n";
          itemcount++;
        }

        // =========================================
        //   BOOKLET/TOC - reprezentativny
        // =========================================
        const cursorBooklet = db.collection(filesCollection).find({ "archive": mongo.ObjectId(archiveId), "fileType": "toc" });
        while(await cursorBooklet.hasNext()) {
          const booklet = await cursorBooklet.next();

          coverNo++;
          var bookletSeq = '000' + (coverNo+1);
          bookletSeq = bookletSeq.substring(bookletSeq.length-4);
          fileType = booklet.fileName.split('.');
          _log(db, archiveId, '[ Nalezen reprezentativni booklet archivu - scan cislo: ' + coverSeq + ' ]');

          if (fileType[1] != 'jp2') {
            // transformace na jp2
            tmpFileName = booklet._id + '-booklet.jp2';
            newFileName = 'mc_' + archiveUuid + '_' + bookletSeq + '.jp2';
            _log(db, archiveId, '[ Transformace na JP2: ' + newFileName + ' ]');
            execCode = execSync('bin/convertTIFtoJP2.pl ' + archiveDataDir+'mastercopy/'+booklet.fileName + ' ' + archiveDataDir+'mastercopy/'+booklet._id+'-booklet.jp2');
            fs.unlinkSync(archiveDataDir + 'mastercopy/' + booklet.fileName);
          }
          else {
            // toto je docasny nazov suboru - na pozadovany nazev bude prejmenovan az po prejmenovani vsech medii na docasny nazev
            // kvuli tomu, ze se muze sekvencni cislo skrizit
            tmpFileName = booklet._id + '-booklet.jp2';
            newFileName = 'mc_' + archiveUuid + '_' + bookletSeq + '.jp2';
            if (fs.existsSync(archiveDataDir + 'mastercopy/' + booklet.fileName)) {
              fs.renameSync(archiveDataDir + 'mastercopy/' + booklet.fileName, archiveDataDir + 'mastercopy/' + tmpFileName);
            }
          }

          renameList.push({ '_id': booklet._id, 'curr': archiveDataDir + 'mastercopy/' + tmpFileName, 'new': archiveDataDir + 'mastercopy/' + newFileName });
          await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(booklet._id) }, { $set: { 'fileName': tmpFileName } });

          // doplnit booklet do seznamu md5 a main_mets itemlistu
          coverChecksum = md5.sync(archiveDataDir + 'mastercopy/' + tmpFileName);
          md5File += coverChecksum + ' \\mastercopy\\' + newFileName + "\n";
          manifestMd5File += coverChecksum + ' data/mastercopy/' + newFileName + "\n";
          itemlist += '        <item>\\mastercopy\\' + newFileName + '</item>' + "\n";
          itemcount++;

          //
          // BOOKLET OCR
          //
          ocrTextFileName = 'mc_' + archiveUuid + '_' + bookletSeq + '.txt';
          ocrAltoFileName = 'mc_' + archiveUuid + '_' + bookletSeq + '.xml';
          _log(db, archiveId, '[ OCR bookletu pomoci Abbyy Recognition Server: ' + archiveDataDir+'mastercopy/'+tmpFileName + ' ]');
          var ocrTextFileFullPath = archiveDataDir + 'mastercopy/' + ocrTextFileName;
          if (fs.existsSync(ocrTextFileFullPath)) {
            fs.unlinkSync(ocrTextFileFullPath);
          }
          var ocrAltoFileFullPath = archiveDataDir + 'mastercopy/' + ocrAltoFileName;
          if (fs.existsSync(ocrAltoFileFullPath)) {
            fs.unlinkSync(ocrAltoFileFullPath);
          }
          //execCode = execSync(abbyyDir + 'jre1.6.0_45/bin/java -jar ' + abbyyDir + 'ocr-abbyy.jar ' + archiveDataDir+'mastercopy/'+tmpFileName + ' ' + archiveDataDir+'mastercopy/'+ocrTextFileName + ' ' + archiveDataDir+'mastercopy/'+ocrAltoFileName);
          const request_id = await processOcr(archiveDataDir+'mastercopy/'+tmpFileName);
          var ocr_status = false;
          for (var status_i=0; status_i<=1200; status_i++) {
            ocr_status = await processOcrStatus(request_id);
            if (ocr_status) break;
            await delay(3000);
          }
          if (ocr_status) {
            // download ocr txt
            await download('https://pero-ocr.fit.vutbr.cz/api/download_results/'+request_id+'/img1/txt', archiveDataDir+'mastercopy/'+ocrTextFileName);
            // download ocr alto
            await download('https://pero-ocr.fit.vutbr.cz/api/download_results/'+request_id+'/img1/alto', archiveDataDir+'mastercopy/'+ocrAltoFileName);
          }

          // doplnit OCR TXT do seznamu md5 a main_mets itemlistu
          ocrChecksum = md5.sync(archiveDataDir + 'mastercopy/' + ocrTextFileName);
          md5File += ocrChecksum + ' \\mastercopy\\' + ocrTextFileName + "\n";
          manifestMd5File += ocrChecksum + ' data/mastercopy/' + ocrTextFileName + "\n";
          itemlist += '        <item>\\mastercopy\\' + ocrTextFileName + '</item>' + "\n";
          itemcount++;
          // doplnit OCR ALTO do seznamu md5 a main_mets itemlistu
          ocrChecksum = md5.sync(archiveDataDir + 'mastercopy/' + ocrAltoFileName);
          md5File += ocrChecksum + ' \\mastercopy\\' + ocrAltoFileName + "\n";
          manifestMd5File += ocrChecksum + ' data/mastercopy/' + ocrAltoFileName + "\n";
          itemlist += '        <item>\\mastercopy\\' + ocrAltoFileName + '</item>' + "\n";
          itemcount++;

          //
          // BOOKLET USER COPY 1:8
          //
          usercopyFileName = 'uc_' + archiveUuid + '_' + coverSeq;
          _log(db, archiveId, '[ Transformace na JP2: ' + userCopyFileName + '.jp2 ]');
          execCode = execSync('kdu_transcode -i ' + archiveDataDir+'mastercopy/'+tmpFileName + ' -o ' + archiveDataDir+'usercopy/'+usercopyFileName+'.j2c Corder=RPCL "Cprecincts={256,256},{256,256},{128,128}" ORGtparts=R -rate 3 Clayers=12 "Cmodes={BYPASS}"');
          fs.renameSync(archiveDataDir+'usercopy/'+usercopyFileName+'.j2c', archiveDataDir+'usercopy/'+usercopyFileName+'.jp2');
          // doplnit booklet usercopy 1:8 do seznamu md5 a main_mets itemlistu
          coverChecksum = md5.sync(archiveDataDir + 'usercopy/' + usercopyFileName + '.jp2');
          md5File += coverChecksum + ' \\usercopy\\' + usercopyFileName + '.jp2' + "\n";
          manifestMd5File += coverChecksum + ' data/usercopy/' + usercopyFileName + '.jp2' + "\n";
          itemlist += '        <item>\\usercopy\\' + usercopyFileName + '.jp2' + '</item>' + "\n";
          itemcount++;

          // metadata
          meta = await db.collection(filesCollection).findOne({ "parent": booklet._id });
          tmpFileName = 'amd_mets_' + meta._id + '.xml';
          newFileName = 'amd_mets_' + archiveUuid + '_' + bookletSeq + '.xml';
          _log(db, archiveId, '[ Mets reprezentativniho bookletu: ' + newFileName + ' ]');
          if (fs.existsSync(archiveDataDir + 'amdsec/' + meta.fileName)) {
            dataAmdMetsIsoimg = fs.readFileSync(archiveDataDir + 'amdsec/' + meta.fileName);
            dataAmdMetsIsoimg = dataAmdMetsIsoimg.toString();
            dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###organization###', user.institution);
            dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###uuid###', archiveUuid);
            dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###filename###', archiveDataDir + 'amdsec/' + newFileName);
            fs.writeFileSync(archiveDataDir + 'amdsec/' + meta.fileName, dataAmdMetsIsoimg);
            fs.renameSync(archiveDataDir + 'amdsec/' + meta.fileName, archiveDataDir + 'amdsec/' + tmpFileName);
          }
          renameList.push({ '_id': meta._id, 'curr': archiveDataDir + 'amdsec/' + tmpFileName, 'new': archiveDataDir + 'amdsec/' + newFileName });
          const dataAmdMetsIsoimgMd5 = crypto.createHash('md5').update(dataAmdMetsIsoimg, 'utf8').digest('hex');
          await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(meta._id) }, { $set: { 'fileName': tmpFileName, 'checkSum': dataAmdMetsIsoimgMd5 } });
          md5File += dataAmdMetsIsoimgMd5 + ' \\amdsec\\' + newFileName + "\n";
          manifestMd5File += dataAmdMetsIsoimgMd5 + ' data/amdsec/' + newFileName + "\n";
          itemlist += '        <item>\\amdsec\\' + newFileName + '</item>' + "\n";
          itemcount++;
        }


        // =========================================
        //   MEDIA
        // =========================================
        var j = 0;
        const cursorMedia = db.collection(mediaCollection).find({ archive: mongo.ObjectId(archiveId) }).sort({ 'mediaNo': 1 });
        while(await cursorMedia.hasNext()) {
          const media = await cursorMedia.next();

          // prejmenovat soubor media archiveUuid + mediumSeq . iso
          var mediumSeq = '000' + (j+1);
          mediumSeq = mediumSeq.substring(mediumSeq.length-4);
          tmpFileName = media._id + '.' + media.fileType;
          newFileName = archiveUuid + '_' + mediumSeq + '.' + media.fileType;
          _log(db, archiveId, '[ ZPRACOVANI MEDIA "' + media.mediaNo + '" : ' + newFileName + ']');

          // toto je docasny nazov suboru - na pozadovany nazev bude prejmenovan az po prejmenovani vsech medii na docasny nazev
          // kvuli tomu, ze se muze sekvencni cislo skrizit
          fs.renameSync(archiveDataDir + 'isoimage/' + media.fileName, archiveDataDir + 'isoimage/' + tmpFileName);
          renameList.push({ '_id': media._id, 'curr': archiveDataDir + 'isoimage/' + tmpFileName, 'new': archiveDataDir + 'isoimage/' + newFileName });
          await db.collection(mediaCollection).updateOne({ "_id": mongo.ObjectId(media._id) }, { $set: { 'fileName': tmpFileName } });

          // doplnit ISO do seznamu md5 a main_mets itemlistu
          md5File += media.checkSum + ' \\isoimage\\' + newFileName + "\n";
          manifestMd5File += media.checkSum + ' data/isoimage/' + newFileName + "\n";
          itemlist += '        <item>\\isoimage\\' + newFileName + '</item>' + "\n";
          itemcount++;

          // metadata
          meta = await db.collection(filesCollection).findOne({ "media": mongo.ObjectId(media._id), "fileType": "amdsec-media-meta" });
          tmpFileName = 'amd_mets_isoimg_' + meta._id + '.xml';
          newFileName = 'amd_mets_isoimg_' + archiveUuid + '_' + mediumSeq + '.xml';
          _log(db, archiveId, '[ ZPRACOVANI METS MEDIA: ' + newFileName + ' ]');
          if (fs.existsSync(archiveDataDir + 'amdsec/' + meta.fileName)) {
            dataAmdMetsIsoimg = fs.readFileSync(archiveDataDir + 'amdsec/' + meta.fileName);
            dataAmdMetsIsoimg = dataAmdMetsIsoimg.toString();
            dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###organization###', user.institution);
            dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###uuid###', archiveUuid);
            dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###filename###', archiveDataDir + 'amdsec/' + newFileName);
            fs.writeFileSync(archiveDataDir + 'amdsec/' + meta.fileName, dataAmdMetsIsoimg);
            fs.renameSync(archiveDataDir + 'amdsec/' + meta.fileName, archiveDataDir + 'amdsec/' + tmpFileName);
          }
          renameList.push({ '_id': meta._id, 'curr': archiveDataDir + 'amdsec/' + tmpFileName, 'new': archiveDataDir + 'amdsec/' + newFileName });
          const dataAmdMetsIsoimgMd5 = crypto.createHash('md5').update(dataAmdMetsIsoimg, 'utf8').digest('hex');
          await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(meta._id) }, { $set: { 'fileName': tmpFileName, 'checkSum': dataAmdMetsIsoimgMd5 } });
          md5File += dataAmdMetsIsoimgMd5 + ' \\amdsec\\' + newFileName + "\n";
          manifestMd5File += dataAmdMetsIsoimgMd5 + ' data/amdsec/' + newFileName + "\n";
          itemlist += '        <item>\\amdsec\\' + newFileName + '</item>' + "\n";
          itemcount++;

  //***********************************
  // todo:STRUCT MAP
  //   - LOGICAL
  //   - PHYSICAL
  //***********************************
  /*                    if (j==0) filesec += `
    <mets:fileGrp ID="MC_ISOGRP" USE="master">`;
              if (j==medias.length) filesec += `
    </mets:fileGrp>`;
              filesec += `
      <mets:file SEQ="` + mediumSeq + `" CREATED="` + new Date(media.dtCreated).toISOString() + `" ID="` + media._id + `" MIMETYPE="application/octetstream" CHECKSUM="` + media.checkSum + `" CHECKSUMTYPE="MD5" SIZE="` + media.mediaSize + `">
        <mets:FLocat LOCTYPE="URL" xlink:href="./mastercopymedia/` + media._id + '.' + media.fileType + `" />
      </mets:file>`;

              if (j==0) structlogical += `
    <mets:div DMDID="MODSMD_COLLECTION_0001" ID="COLLECTION_0001" TYPE="COLLECTION">`;
              if (j==medias.length) structlogical += `
    </mets:div>`;
              structlogical += `
      <mets:div DMDID="MODSMD_DISK_` + mediumSeq + `" ID="SIDE_` + mediumSeq + `" LABEL="1" TYPE="SIDE">
  			<mets:div DMDID="MODSMD_SUPPL_` + mediumSeq + `" ID="SUPPLEMENT_` + mediumSeq + `" LABEL="imgdisc" TYPE="SUPPLEMENT"/>
  		</mets:div>`;

              if (j==0) structphysical += `
    <mets:div DMDID="MODSMD_COLLECTION_0001" ID="DIV_0000">`;
              if (j==medias.length) structphysical += `
    </mets:div>`;
              structphysical += `
      <mets:div ID="DIV_ISO_` + mediumSeq + `" ORDER="` + mediumSeq + `" ORDERLABEL="[` + mediumSeq + `]" TYPE="iso">
        <mets:fptr FILEID="mca_1234567890-0001"/>
        <mets:fptr FILEID="uca_1234567890-0001"/>
        <mets:fptr FILEID="amd_mets_audio_1234567890-0001"/>
      </mets:div>`;
  */


          // =========================================================
          //   COVER
          // =========================================================
          const cursorCoverMedia = db.collection(filesCollection).find({ "media": mongo.ObjectId(media._id), "fileType": "cover" });
          while(await cursorCoverMedia.hasNext()) {
            const cover = await cursorCoverMedia.next();
            // pokud je reprezentativny uz byl spracovan
            if (cover.archive && cover.archive.toString() == archiveId) continue;

            coverNo++;
            coverSeq = '000' + coverNo;
            coverSeq = coverSeq.substring(coverSeq.length-4);
            fileType = cover.fileName.split('.');
            _log(db, archiveId, '[ Nalezena obalka media - scan cislo: ' + coverSeq + ' ]');

            if (fileType[1] != 'jp2') {
              // transformace na jp2
              tmpFileName = cover._id + '-cover.jp2';
              newFileName = 'mc_' + archiveUuid + '_' + coverSeq + '.jp2';
              _log(db, archiveId, '[ Transformace na JP2: ' + newFileName + ' ]');
              execCode = execSync('bin/convertTIFtoJP2.pl ' + archiveDataDir+'mastercopy/'+cover.fileName + ' ' + archiveDataDir+'mastercopy/'+cover._id+'-cover.jp2');
              fs.unlinkSync(archiveDataDir + 'mastercopy/' + cover.fileName);
            }
            else {
              // toto je docasny nazov suboru - na pozadovany nazev bude prejmenovan az po prejmenovani vsech medii na docasny nazev
              // kvuli tomu, ze se muze sekvencni cislo skrizit
              tmpFileName = cover._id + '-cover.jp2';
              newFileName = 'mc_' + archiveUuid + '_' + coverSeq + '.jp2';
              if (fs.existsSync(archiveDataDir + 'mastercopy/' + cover.fileName)) {
                fs.renameSync(archiveDataDir + 'mastercopy/' + cover.fileName, archiveDataDir + 'mastercopy/' + tmpFileName);
              }
            }

            renameList.push({ '_id': cover._id, 'curr': archiveDataDir + 'mastercopy/' + tmpFileName, 'new': archiveDataDir + 'mastercopy/' + newFileName });
            await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(cover._id) }, { $set: { 'fileName': tmpFileName } });

            // toto je prvni cover archivu = archiv nema reprezentativni cover
            // ted vytvarime reprezentativni cover
            if (coverNo === 1) {
              await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(cover._id) }, { $set: { 'archive': mongo.ObjectId(archiveId) } });
            }

            // doplnit cover do seznamu md5 a main_mets itemlistu
            coverChecksum = md5.sync(archiveDataDir + 'mastercopy/' + tmpFileName);
            md5File += coverChecksum + ' \\mastercopy\\' + newFileName + "\n";
            manifestMd5File += coverChecksum + ' data/mastercopy/' + newFileName + "\n";
            itemlist += '        <item>\\mastercopy\\' + newFileName + '</item>' + "\n";
            itemcount++;

            //
            // COVER USER COPY 1:8
            //
            usercopyFileName = 'uc_' + archiveUuid + '_' + coverSeq;
            _log(db, archiveId, '[ Transformace na JP2: ' + usercopyFileName + '.jp2 ]');
            execCode = execSync('kdu_transcode -i ' + archiveDataDir+'mastercopy/'+tmpFileName + ' -o ' + archiveDataDir+'usercopy/'+usercopyFileName+'.j2c Corder=RPCL "Cprecincts={256,256},{256,256},{128,128}" ORGtparts=R -rate 3 Clayers=12 "Cmodes={BYPASS}"');
            fs.renameSync(archiveDataDir+'usercopy/'+usercopyFileName+'.j2c', archiveDataDir+'usercopy/'+usercopyFileName+'.jp2');
            // doplnit booklet usercopy 1:8 do seznamu md5 a main_mets itemlistu
            coverChecksum = md5.sync(archiveDataDir + 'usercopy/' + usercopyFileName + '.jp2');
            md5File += coverChecksum + ' \\usercopy\\' + usercopyFileName + '.jp2' + "\n";
            manifestMd5File += coverChecksum + ' data/usercopy/' + usercopyFileName + '.jp2' + "\n";
            itemlist += '        <item>\\usercopy\\' + usercopyFileName + '.jp2' + '</item>' + "\n";
            itemcount++;

            // metadata
            meta = await db.collection(filesCollection).findOne({ "parent": cover._id });
            if (meta) {
              tmpFileName = 'amd_mets_' + meta._id + '.xml';
              newFileName = 'amd_mets_' + archiveUuid + '_' + coverSeq + '.xml';
              _log(db, archiveId, '[ Mets obalky media: ' + newFileName + ' ]');
              if (fs.existsSync(archiveDataDir + 'amdsec/' + meta.fileName)) {
                dataAmdMetsIsoimg = fs.readFileSync(archiveDataDir + 'amdsec/' + meta.fileName);
                dataAmdMetsIsoimg = dataAmdMetsIsoimg.toString();
                dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###organization###', user.institution);
                dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###uuid###', archiveUuid);
                dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###filename###', archiveDataDir + 'amdsec/' + newFileName);
                fs.writeFileSync(archiveDataDir + 'amdsec/' + meta.fileName, dataAmdMetsIsoimg);
                fs.renameSync(archiveDataDir + 'amdsec/' + meta.fileName, archiveDataDir + 'amdsec/' + tmpFileName);
              }
              renameList.push({ '_id': meta._id, 'curr': archiveDataDir + 'amdsec/' + tmpFileName, 'new': archiveDataDir + 'amdsec/' + newFileName });
              const dataAmdMetsIsoimgMd5 = crypto.createHash('md5').update(dataAmdMetsIsoimg, 'utf8').digest('hex');
              await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(meta._id) }, { $set: { 'fileName': tmpFileName, 'checkSum': dataAmdMetsIsoimgMd5 } });
              md5File += dataAmdMetsIsoimgMd5 + ' \\amdsec\\' + newFileName + "\n";
              manifestMd5File += dataAmdMetsIsoimgMd5 + ' data/amdsec/' + newFileName + "\n";
              itemlist += '        <item>\\amdsec\\' + newFileName + '</item>' + "\n";
              itemcount++;
            }
          }

          // =======================================================
          //   BOOKLET
          // =======================================================
          const cursorBookletMedia = db.collection(filesCollection).find({ "media": mongo.ObjectId(media._id), "fileType": "toc" });
          while(await cursorBookletMedia.hasNext()) {
            const booklet = await cursorBookletMedia.next();
            // pokud je reprezentativny uz byl spracovan
            if (booklet.archive && booklet.archive == archiveId) continue;

            coverNo++;
            coverSeq = '000' + coverNo;
            coverSeq = coverSeq.substring(coverSeq.length-4);
            fileType = booklet.fileName.split('.');
            _log(db, archiveId, '[ Nalezen booklet media - scan cislo: ' + coverSeq + ' ]');

            if (fileType[1] != 'jp2') {
              // transformace na jp2
              tmpFileName = booklet._id + '-booklet.jp2';
              newFileName = 'mc_' + archiveUuid + '_' + coverSeq + '.jp2';
              _log(db, archiveId, '[ Transformace na JP2: ' + newFileName + ' ]');
              execCode = execSync('bin/convertTIFtoJP2.pl ' + archiveDataDir+'mastercopy/'+booklet.fileName + ' ' + archiveDataDir+'mastercopy/'+booklet._id+'-booklet.jp2');
              fs.unlinkSync(archiveDataDir + 'mastercopy/' + booklet.fileName);
            }
            else {
              // toto je docasny nazov suboru - na pozadovany nazev bude prejmenovan az po prejmenovani vsech medii na docasny nazev
              // kvuli tomu, ze se muze sekvencni cislo skrizit
              tmpFileName = booklet._id + '-booklet.jp2';
              newFileName = 'mc_' + archiveUuid + '_' + coverSeq + '.jp2';
              if (fs.existsSync(archiveDataDir + 'mastercopy/' + booklet.fileName)) {
                fs.renameSync(archiveDataDir + 'mastercopy/' + booklet.fileName, archiveDataDir + 'mastercopy/' + tmpFileName);
              }
            }

            renameList.push({ '_id': booklet._id, 'curr': archiveDataDir + 'mastercopy/' + tmpFileName, 'new': archiveDataDir + 'mastercopy/' + newFileName });
            await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(booklet._id) }, { $set: { 'fileName': tmpFileName } });

            // doplnit booklet do seznamu md5 a main_mets itemlistu
            coverChecksum = md5.sync(archiveDataDir + 'mastercopy/' + tmpFileName);
            md5File += coverChecksum + ' \\mastercopy\\' + newFileName + "\n";
            manifestMd5File += coverChecksum + ' data/mastercopy/' + newFileName + "\n";
            itemlist += '        <item>\\mastercopy\\' + newFileName + '</item>' + "\n";
            itemcount++;

            //
            // BOOKLET OCR
            //
            ocrTextFileName = 'mc_' + archiveUuid + '_' + coverSeq + '.txt';
            ocrAltoFileName = 'mc_' + archiveUuid + '_' + coverSeq + '.xml';
            _log(db, archiveId, '[ OCR bookletu: ' + archiveDataDir+'mastercopy/'+tmpFileName + ' ]');
            var ocrTextFileFullPath = archiveDataDir + 'mastercopy/' + ocrTextFileName;
            if (fs.existsSync(ocrTextFileFullPath)) {
              fs.unlinkSync(ocrTextFileFullPath);
            }
            var ocrAltoFileFullPath = archiveDataDir + 'mastercopy/' + ocrAltoFileName;
            if (fs.existsSync(ocrAltoFileFullPath)) {
              fs.unlinkSync(ocrAltoFileFullPath);
            }
            //execCode = execSync(abbyyDir + 'jre1.6.0_45/bin/java -jar ' + abbyyDir + 'ocr-abbyy.jar ' + archiveDataDir+'mastercopy/'+tmpFileName + ' ' + archiveDataDir+'mastercopy/'+ocrTextFileName + ' ' + archiveDataDir+'mastercopy/'+ocrAltoFileName);
            const request_id = await processOcr(archiveDataDir+'mastercopy/'+tmpFileName);
            var ocr_status = false;
            for (var status_i=0; status_i<=1200; status_i++) {
              ocr_status = await processOcrStatus(request_id);
              if (ocr_status) break;
              await delay(3000);
            }
            if (ocr_status) {
              // download ocr txt
              await download('https://pero-ocr.fit.vutbr.cz/api/download_results/'+request_id+'/img1/txt', archiveDataDir+'mastercopy/'+ocrTextFileName);
              // download ocr alto
              await download('https://pero-ocr.fit.vutbr.cz/api/download_results/'+request_id+'/img1/alto', archiveDataDir+'mastercopy/'+ocrAltoFileName);
            }

            // doplnit OCR TXT do seznamu md5 a main_mets itemlistu
            ocrChecksum = md5.sync(archiveDataDir + 'mastercopy/' + ocrTextFileName);
            md5File += ocrChecksum + ' \\mastercopy\\' + ocrTextFileName + "\n";
            manifestMd5File += ocrChecksum + ' data/mastercopy/' + ocrTextFileName + "\n";
            itemlist += '        <item>\\mastercopy\\' + ocrTextFileName + '</item>' + "\n";
            itemcount++;
            // doplnit OCR ALTO do seznamu md5 a main_mets itemlistu
            ocrChecksum = md5.sync(archiveDataDir + 'mastercopy/' + ocrAltoFileName);
            md5File += ocrChecksum + ' \\mastercopy\\' + ocrAltoFileName + "\n";
            manifestMd5File += ocrChecksum + ' data/mastercopy/' + ocrAltoFileName + "\n";
            itemlist += '        <item>\\mastercopy\\' + ocrAltoFileName + '</item>' + "\n";
            itemcount++;

            //
            // BOOKLET USER COPY 1:8
            //
            usercopyFileName = 'uc_' + archiveUuid + '_' + coverSeq;
            _log(db, archiveId, '[ Transformace na JP2: ' + usercopyFileName + '.jp2 ]');
            execCode = execSync('kdu_transcode -i ' + archiveDataDir+'mastercopy/'+tmpFileName + ' -o ' + archiveDataDir+'usercopy/'+usercopyFileName+'.j2c Corder=RPCL "Cprecincts={256,256},{256,256},{128,128}" ORGtparts=R -rate 3 Clayers=12 "Cmodes={BYPASS}"');
            fs.renameSync(archiveDataDir+'usercopy/'+usercopyFileName+'.j2c', archiveDataDir+'usercopy/'+usercopyFileName+'.jp2');
            // doplnit booklet usercopy 1:8 do seznamu md5 a main_mets itemlistu
            coverChecksum = md5.sync(archiveDataDir + 'usercopy/' + usercopyFileName + '.jp2');
            md5File += coverChecksum + ' \\usercopy\\' + usercopyFileName + '.jp2' + "\n";
            manifestMd5File += coverChecksum + ' data/usercopy/' + usercopyFileName + '.jp2' + "\n";
            itemlist += '        <item>\\usercopy\\' + usercopyFileName + '.jp2' + '</item>' + "\n";
            itemcount++;

            // metadata
            meta = await db.collection(filesCollection).findOne({ "parent": booklet._id });
            if (meta) {
              tmpFileName = 'amd_mets_' + meta._id + '.xml';
              newFileName = 'amd_mets_' + archiveUuid + '_' + coverSeq + '.xml';
              _log(db, archiveId, '[ Mets bookletu: ' + newFileName + ' ]');
              if (fs.existsSync(archiveDataDir + 'amdsec/' + meta.fileName)) {
                dataAmdMetsIsoimg = fs.readFileSync(archiveDataDir + 'amdsec/' + meta.fileName);
                dataAmdMetsIsoimg = dataAmdMetsIsoimg.toString();
                dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###organization###', user.institution);
                dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###uuid###', archiveUuid);
                dataAmdMetsIsoimg = dataAmdMetsIsoimg.replace('###filename###', archiveDataDir + 'amdsec/' + newFileName);
                fs.writeFileSync(archiveDataDir + 'amdsec/' + meta.fileName, dataAmdMetsIsoimg);
                fs.renameSync(archiveDataDir + 'amdsec/' + meta.fileName, archiveDataDir + 'amdsec/' + tmpFileName);
              }
              renameList.push({ '_id': meta._id, 'curr': archiveDataDir + 'amdsec/' + tmpFileName, 'new': archiveDataDir + 'amdsec/' + newFileName });
              const dataAmdMetsIsoimgMd5 = crypto.createHash('md5').update(dataAmdMetsIsoimg, 'utf8').digest('hex');
              await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(meta._id) }, { $set: { 'fileName': tmpFileName, 'checkSum': dataAmdMetsIsoimgMd5 } });
              md5File += dataAmdMetsIsoimgMd5 + ' \\amdsec\\' + newFileName + "\n";
              manifestMd5File += dataAmdMetsIsoimgMd5 + ' data/amdsec/' + newFileName + "\n";
              itemlist += '        <item>\\amdsec\\' + newFileName  + '</item>' + "\n";
              itemcount++;
            }
          }

          j++;
        } // media

        // ===================================================
        //   DROID
        // ===================================================
        _log(db, archiveId, '[ Zacina analyza DROID vsech medii archivu ' + archiveUuid + ' ]');
        try {
          execSync('./bin/droid-6.4/droid.sh -a ' + archiveDataDir+'isoimage -p ' + archiveDataDir+'droid.profile', { 'timeout': 1800000, 'killSignal': 'SIGKILL' });
          execSync('./bin/droid-6.4/droid.sh -p ' + archiveDataDir+'droid.profile -n "Comprehensive breakdown" -t xml -r ' + archiveDataDir+'droid_'+archiveUuid+'.xml', { 'timeout': 1800000, 'killSignal': 'SIGKILL' });
          // protoze DROID obsahuje bug; nekopiruje report tam kam chceme, musime si report najit a skopirovat sami
          fs.readdirSync(process.env.DROID_TMP_DIR + '/').forEach(file => {
            fs.copyFileSync(process.env.DROID_TMP_DIR + '/' + file, archiveDataDir+'droid_'+archiveUuid+'.xml');
            fs.unlinkSync(process.env.DROID_TMP_DIR + '/' + file);
          });
          fs.unlinkSync(archiveDataDir + 'droid.profile');
          var droidChecksum = md5.sync(archiveDataDir + 'droid_' + archiveUuid + '.xml');
          md5File += droidChecksum + ' \\' + 'droid_' + archiveUuid + '.xml' + "\n";
          manifestMd5File += droidChecksum + ' data/' + 'droid_' + archiveUuid + '.xml' + "\n";
          itemlist += '        <item>\\' + 'droid_' + archiveUuid + '.xml' + '</item>' + "\n";
          itemcount++;
          _log(db, archiveId, '[ Ukoncena analyza DROID vsech medii archivu: ' + archiveUuid + ' ]');
        }
        catch (err) {
          console.log(err);
          if (err.code == 'ETIMEDOUT') {
            archiveFinalStatus = 5; // DROID timeoutoval
          } else {
            archiveFinalStatus = 6; // jiny problem s analyzou DROID
          }
          _log(db, archiveId, '[ DROID analyza neuspesna ]');
          // odmazeme existujici droid.profile
          if (fs.existsSync(archiveDataDir+'droid.profile')) {
            fs.unlinkSync(archiveDataDir+'droid.profile');
          }
          // zapis status do DB a ukonci spracovani aktualniho archivu
          await db.collection(archiveCollection).updateOne({ _id: mongo.ObjectId(archiveId) }, { $set: { status: archiveFinalStatus } });
          continue;
        }

        _log(db, archiveId, '[ Priprava souboru main_mets, info, md5 a bagit manifestu ]');

        // todo: STRUCT MAP
        metsFile = metsFile.replace('###filesec###', filesec);
        metsFile = metsFile.replace('###structlogical###', structlogical);
        metsFile = metsFile.replace('###structphysical###', structphysical);

        var dataMods = fs.readFileSync(archiveDataDir + 'dmdsec/dmd_mods_' + archiveUuid + '.xml');

        const modsMd5 = crypto.createHash('md5').update(dataMods, 'utf8').digest('hex');
        md5File += modsMd5 + ' \\dmdsec/dmd_mods_' + archiveUuid + '.xml' + "\n";
        manifestMd5File += modsMd5 + ' data/dmdsec/dmd_mods_' + archiveUuid + '.xml' + "\n";

        metsFile = metsFile.replace('###mods###', dataMods);
        const metsMd5 = crypto.createHash('md5').update(metsFile, 'utf8').digest('hex');

        md5File += metsMd5 + ' \\main_mets_' + archiveUuid + '.xml' + "\n";
        const md5Md5 = crypto.createHash('md5').update(md5File, 'utf8').digest('hex');

        itemlist += '        <item>\\main_mets_' + archiveUuid + '.xml</item>' + "\n";
        itemcount++;
        itemlist += '        <item>\\md5_' + archiveUuid + '.md5</item>';
        itemcount++;

        // =================================================
        //   RENAME
        // =================================================
        _log(db, archiveId, '[ Dokoncovani SIP a BAGIT baliku ]');
        for (var ri=0; ri<renameList.length; ri++) {
          var renameItem = renameList[ri];
          if (fs.existsSync(renameItem.curr)) {
            fs.renameSync(renameItem.curr, renameItem.new);
            var collectionFileNameSplitted = renameItem.new.split('/');
            var collectionFileName = collectionFileNameSplitted[collectionFileNameSplitted.length-1];
            await db.collection(renameItem.curr.indexOf('/isoimage/')>-1 ? mediaCollection : filesCollection).updateOne({ _id: renameItem._id }, { $set: { fileName: collectionFileName } });
          } else {
            _log(db, archiveId, '!!! ' + renameItem.curr);
          }
        }

        // Oznac archiv jako zpracovany
        await db.collection(archiveCollection).updateOne({ _id: mongo.ObjectId(archiveId) }, { $set: { status: archiveFinalStatus } });

        // =================================================
        //   Zjisti velikost celeho archivu a zapis metadata
        // =================================================
        infoFile = infoFile.replace('###itemlist###', itemlist);
        infoFile = infoFile.replace('###md5sum###', md5Md5);
        infoFile = infoFile.replace('###itemtotal###', itemcount);
        console.log('*1');
        const size = getFolderSize(archiveDir);
        console.log('*2');
        infoFile = infoFile.replace('###archivesize###', size);
        const infoMd5 = crypto.createHash('md5').update(infoFile, 'utf8').digest('hex');

        manifestMd5File += metsMd5 + ' data/main_mets_' + archiveUuid + '.xml' + "\n";
        manifestMd5File += md5Md5 + ' data/md5_' + archiveUuid + '.md5' + "\n";
        manifestMd5File += infoMd5 + ' data/info_' + archiveUuid + '.xml' + "\n";

        console.log(archiveDataDir + 'main_mets_' + archiveUuid + '.xml');
        fs.writeFileSync(archiveDataDir + 'main_mets_' + archiveUuid + '.xml', metsFile);
        console.log(archiveDataDir + 'md5_' + archiveUuid + '.md5');
        fs.writeFileSync(archiveDataDir + 'md5_' + archiveUuid + '.md5', md5File);
        console.log(archiveDataDir + 'info_' + archiveUuid + '.xml');
        fs.writeFileSync(archiveDataDir + 'info_' + archiveUuid + '.xml', infoFile);
        console.log(archiveDir + '/manifest-md5.txt');
        fs.writeFileSync(archiveDir + '/manifest-md5.txt', manifestMd5File);
        console.log(archiveDir + '/bagit.txt');
        fs.writeFileSync(archiveDir + '/bagit.txt', "BagIt-Version: 0.97\nTag-File-Character-Encoding: UTF-8");
        console.log('*3');

        _log(db, archiveId, '[ UKONCENE ZPRACOVANI ARCHIVU: ' + archive.uuid + ' ]');
        processedArchives++;

      } // archivy

      if (processedArchives) {
        _log(db, archiveId, '[ Idle ]');
      }
      else {
        // zadny procesovany archiv, poznac cas dobehnuti cronu
        const cursorLastLog = db.collection(logCollection).find({}).sort({ '_id': -1 });
        while(await cursorLastLog.hasNext()) {
          const lastLog = await cursorLastLog.next();
          if (lastLog.msg == '[ Idle ]') {
            await db.collection(logCollection).updateOne({ _id: lastLog._id }, { $set: { 'dtCreated': Date.now() } });
          }
          break;
        }
      }

      client.close();

    } catch(e) {
      _log(db, archiveId, '[ ' + e + ' ]');
      client.close();
    } // try/catch

  })(); // hlavni async funkce

}); // client.connect

}}); // file lock
