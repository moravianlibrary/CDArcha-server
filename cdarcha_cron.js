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
const fs = require('fs');
const md5 = require('md5-file');
const getFolderSize = require('get-folder-size');
const lockFile = require('lockfile');

const MongoClient = require('mongodb').MongoClient;
const client = new MongoClient(process.env.MONGODB_URI, { useUnifiedTopology: true });


function _log(db, archiveId, msg) {
  db.collection(logCollection).insertOne({ 'dtCreated': Date.now(), 'archive': mongo.ObjectId(archiveId), 'msg': msg });
  console.log(msg);
}


// pouze jeden beh scriptu
lockFile.check('cdarcha_cron.lock', function (er, isLocked) {
if (!isLocked) {

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
      //const cursorArchives = db.collection(archiveCollection).find({ _id: mongo.ObjectId('5c17802233cf5476d55ea92b') });
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

        // pripravit adresar pro usercopyscan
        var ucsDir = archiveDataDir + 'usercopyscan';
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
            newFileName = 'mcs_' + archiveUuid + '_' + coverSeq + '.jp2';
            _log(db, archiveId, '[ Transformace na JP2: ' + newFileName + ' ]');
            execCode = execSync('bin/convertTIFtoJP2.pl ' + archiveDataDir+'mastercopyscan/'+cover.fileName + ' ' + archiveDataDir+'mastercopyscan/'+archiveId+'-cover.jp2');
            fs.unlinkSync(archiveDataDir + 'mastercopyscan/' + cover.fileName);
          }
          else {
            // toto je docasny nazov suboru - na pozadovany nazev bude prejmenovan az po prejmenovani vsech medii na docasny nazev
            // kvuli tomu, ze se muze sekvencni cislo skrizit
            tmpFileName = archiveId + '-cover.jp2';
            newFileName = 'mcs_' + archiveUuid + '_' + coverSeq + '.jp2';
            if (fs.existsSync(archiveDataDir + 'mastercopyscan/' + cover.fileName)) {
              fs.renameSync(archiveDataDir + 'mastercopyscan/' + cover.fileName, archiveDataDir + 'mastercopyscan/' + tmpFileName);
            }
          }

          renameList.push({ '_id': cover._id, 'curr': archiveDataDir + 'mastercopyscan/' + tmpFileName, 'new': archiveDataDir + 'mastercopyscan/' + newFileName });
          await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(cover._id) }, { $set: { 'fileName': tmpFileName } });

          // doplnit cover do seznamu md5 a main_mets itemlistu
          coverChecksum = md5.sync(archiveDataDir + 'mastercopyscan/' + tmpFileName);
          md5File += coverChecksum + ' \\mastercopyscan\\' + newFileName + "\n";
          manifestMd5File += coverChecksum + ' data/mastercopyscan/' + newFileName + "\n";
          itemlist += '        <item>\\mastercopyscan\\' + newFileName + '</item>' + "\n";
          itemcount++;

          //
          // COVER USER COPY 1:8
          //
          usercopyFileName = 'ucs_' + archiveUuid + '_' + coverSeq;
          _log(db, archiveId, '[ Transformace na JP2: ' + usercopyFileName + '.jp2 ]');
          execCode = execSync('kdu_transcode -i ' + archiveDataDir+'mastercopyscan/'+tmpFileName + ' -o ' + archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c Corder=RPCL "Cprecincts={256,256},{256,256},{128,128}" ORGtparts=R -rate 3 Clayers=12 "Cmodes={BYPASS}"');
          fs.renameSync(archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c', archiveDataDir+'usercopyscan/'+usercopyFileName+'.jp2');
          // doplnit booklet usercopy 1:8 do seznamu md5 a main_mets itemlistu
          coverChecksum = md5.sync(archiveDataDir + 'usercopyscan/' + usercopyFileName + '.jp2');
          md5File += coverChecksum + ' \\usercopyscan\\' + usercopyFileName + '.jp2' + "\n";
          manifestMd5File += coverChecksum + ' data/usercopyscan/' + usercopyFileName + '.jp2' + "\n";
          itemlist += '        <item>\\usercopyscan\\' + usercopyFileName + '.jp2' + '</item>' + "\n";
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
            newFileName = 'mcs_' + archiveUuid + '_' + bookletSeq + '.jp2';
            _log(db, archiveId, '[ Transformace na JP2: ' + newFileName + ' ]');
            execCode = execSync('bin/convertTIFtoJP2.pl ' + archiveDataDir+'mastercopyscan/'+booklet.fileName + ' ' + archiveDataDir+'mastercopyscan/'+booklet._id+'-booklet.jp2');
            fs.unlinkSync(archiveDataDir + 'mastercopyscan/' + booklet.fileName);
          }
          else {
            // toto je docasny nazov suboru - na pozadovany nazev bude prejmenovan az po prejmenovani vsech medii na docasny nazev
            // kvuli tomu, ze se muze sekvencni cislo skrizit
            tmpFileName = booklet._id + '-booklet.jp2';
            newFileName = 'mcs_' + archiveUuid + '_' + bookletSeq + '.jp2';
            if (fs.existsSync(archiveDataDir + 'mastercopyscan/' + booklet.fileName)) {
              fs.renameSync(archiveDataDir + 'mastercopyscan/' + booklet.fileName, archiveDataDir + 'mastercopyscan/' + tmpFileName);
            }
          }

          renameList.push({ '_id': booklet._id, 'curr': archiveDataDir + 'mastercopyscan/' + tmpFileName, 'new': archiveDataDir + 'mastercopyscan/' + newFileName });
          await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(booklet._id) }, { $set: { 'fileName': tmpFileName } });

          // doplnit booklet do seznamu md5 a main_mets itemlistu
          coverChecksum = md5.sync(archiveDataDir + 'mastercopyscan/' + tmpFileName);
          md5File += coverChecksum + ' \\mastercopyscan\\' + newFileName + "\n";
          manifestMd5File += coverChecksum + ' data/mastercopyscan/' + newFileName + "\n";
          itemlist += '        <item>\\mastercopyscan\\' + newFileName + '</item>' + "\n";
          itemcount++;

          //
          // BOOKLET OCR
          //
          ocrTextFileName = 'mcs_' + archiveUuid + '_' + bookletSeq + '.txt';
          ocrAltoFileName = 'mcs_' + archiveUuid + '_' + bookletSeq + '.xml';
          _log(db, archiveId, '[ OCR bookletu pomoci Abbyy Recognition Server: ' + archiveDataDir+'mastercopyscan/'+tmpFileName + ' ]');
          var ocrTextFileFullPath = archiveDataDir + 'mastercopyscan/' + ocrTextFileName;
          if (fs.existsSync(ocrTextFileFullPath)) {
            fs.unlinkSync(ocrTextFileFullPath);
          }
          var ocrAltoFileFullPath = archiveDataDir + 'mastercopyscan/' + ocrAltoFileName;
          if (fs.existsSync(ocrAltoFileFullPath)) {
            fs.unlinkSync(ocrAltoFileFullPath);
          }
          execCode = execSync(abbyyDir + 'jre1.6.0_45/bin/java -jar ' + abbyyDir + 'ocr-abbyy.jar ' + archiveDataDir+'mastercopyscan/'+tmpFileName + ' ' + archiveDataDir+'mastercopyscan/'+ocrTextFileName + ' ' + archiveDataDir+'mastercopyscan/'+ocrAltoFileName);
          // doplnit OCR TXT do seznamu md5 a main_mets itemlistu
          ocrChecksum = md5.sync(archiveDataDir + 'mastercopyscan/' + ocrTextFileName);
          md5File += ocrChecksum + ' \\mastercopyscan\\' + ocrTextFileName + "\n";
          manifestMd5File += ocrChecksum + ' data/mastercopyscan/' + ocrTextFileName + "\n";
          itemlist += '        <item>\\mastercopyscan\\' + ocrTextFileName + '</item>' + "\n";
          itemcount++;
          // doplnit OCR ALTO do seznamu md5 a main_mets itemlistu
          ocrChecksum = md5.sync(archiveDataDir + 'mastercopyscan/' + ocrAltoFileName);
          md5File += ocrChecksum + ' \\mastercopyscan\\' + ocrAltoFileName + "\n";
          manifestMd5File += ocrChecksum + ' data/mastercopyscan/' + ocrAltoFileName + "\n";
          itemlist += '        <item>\\mastercopyscan\\' + ocrAltoFileName + '</item>' + "\n";
          itemcount++;

          //
          // BOOKLET USER COPY 1:8
          //
          usercopyFileName = 'ucs_' + archiveUuid + '_' + coverSeq;
          _log(db, archiveId, '[ Transformace na JP2: ' + userCopyFileName + '.jp2 ]');
          execCode = execSync('kdu_transcode -i ' + archiveDataDir+'mastercopyscan/'+tmpFileName + ' -o ' + archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c Corder=RPCL "Cprecincts={256,256},{256,256},{128,128}" ORGtparts=R -rate 3 Clayers=12 "Cmodes={BYPASS}"');
          fs.renameSync(archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c', archiveDataDir+'usercopyscan/'+usercopyFileName+'.jp2');
          // doplnit booklet usercopy 1:8 do seznamu md5 a main_mets itemlistu
          coverChecksum = md5.sync(archiveDataDir + 'usercopyscan/' + usercopyFileName + '.jp2');
          md5File += coverChecksum + ' \\usercopyscan\\' + usercopyFileName + '.jp2' + "\n";
          manifestMd5File += coverChecksum + ' data/usercopyscan/' + usercopyFileName + '.jp2' + "\n";
          itemlist += '        <item>\\usercopyscan\\' + usercopyFileName + '.jp2' + '</item>' + "\n";
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
              newFileName = 'mcs_' + archiveUuid + '_' + coverSeq + '.jp2';
              _log(db, archiveId, '[ Transformace na JP2: ' + newFileName + ' ]');
              execCode = execSync('bin/convertTIFtoJP2.pl ' + archiveDataDir+'mastercopyscan/'+cover.fileName + ' ' + archiveDataDir+'mastercopyscan/'+cover._id+'-cover.jp2');
              fs.unlinkSync(archiveDataDir + 'mastercopyscan/' + cover.fileName);
            }
            else {
              // toto je docasny nazov suboru - na pozadovany nazev bude prejmenovan az po prejmenovani vsech medii na docasny nazev
              // kvuli tomu, ze se muze sekvencni cislo skrizit
              tmpFileName = cover._id + '-cover.jp2';
              newFileName = 'mcs_' + archiveUuid + '_' + coverSeq + '.jp2';
              if (fs.existsSync(archiveDataDir + 'mastercopyscan/' + cover.fileName)) {
                fs.renameSync(archiveDataDir + 'mastercopyscan/' + cover.fileName, archiveDataDir + 'mastercopyscan/' + tmpFileName);
              }
            }

            renameList.push({ '_id': cover._id, 'curr': archiveDataDir + 'mastercopyscan/' + tmpFileName, 'new': archiveDataDir + 'mastercopyscan/' + newFileName });
            await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(cover._id) }, { $set: { 'fileName': tmpFileName } });

            // toto je prvni cover archivu = archiv nema reprezentativni cover
            // ted vytvarime reprezentativni cover
            if (coverNo === 1) {
              await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(cover._id) }, { $set: { 'archive': mongo.ObjectId(archiveId) } });
            }

            // doplnit cover do seznamu md5 a main_mets itemlistu
            coverChecksum = md5.sync(archiveDataDir + 'mastercopyscan/' + tmpFileName);
            md5File += coverChecksum + ' \\mastercopyscan\\' + newFileName + "\n";
            manifestMd5File += coverChecksum + ' data/mastercopyscan/' + newFileName + "\n";
            itemlist += '        <item>\\mastercopyscan\\' + newFileName + '</item>' + "\n";
            itemcount++;

            //
            // COVER USER COPY 1:8
            //
            usercopyFileName = 'ucs_' + archiveUuid + '_' + coverSeq;
            _log(db, archiveId, '[ Transformace na JP2: ' + usercopyFileName + '.jp2 ]');
            execCode = execSync('kdu_transcode -i ' + archiveDataDir+'mastercopyscan/'+tmpFileName + ' -o ' + archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c Corder=RPCL "Cprecincts={256,256},{256,256},{128,128}" ORGtparts=R -rate 3 Clayers=12 "Cmodes={BYPASS}"');
            fs.renameSync(archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c', archiveDataDir+'usercopyscan/'+usercopyFileName+'.jp2');
            // doplnit booklet usercopy 1:8 do seznamu md5 a main_mets itemlistu
            coverChecksum = md5.sync(archiveDataDir + 'usercopyscan/' + usercopyFileName + '.jp2');
            md5File += coverChecksum + ' \\usercopyscan\\' + usercopyFileName + '.jp2' + "\n";
            manifestMd5File += coverChecksum + ' data/usercopyscan/' + usercopyFileName + '.jp2' + "\n";
            itemlist += '        <item>\\usercopyscan\\' + usercopyFileName + '.jp2' + '</item>' + "\n";
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
              newFileName = 'mcs_' + archiveUuid + '_' + coverSeq + '.jp2';
              _log(db, archiveId, '[ Transformace na JP2: ' + newFileName + ' ]');
              execCode = execSync('bin/convertTIFtoJP2.pl ' + archiveDataDir+'mastercopyscan/'+booklet.fileName + ' ' + archiveDataDir+'mastercopyscan/'+booklet._id+'-booklet.jp2');
              fs.unlinkSync(archiveDataDir + 'mastercopyscan/' + booklet.fileName);
            }
            else {
              // toto je docasny nazov suboru - na pozadovany nazev bude prejmenovan az po prejmenovani vsech medii na docasny nazev
              // kvuli tomu, ze se muze sekvencni cislo skrizit
              tmpFileName = booklet._id + '-booklet.jp2';
              newFileName = 'mcs_' + archiveUuid + '_' + coverSeq + '.jp2';
              if (fs.existsSync(archiveDataDir + 'mastercopyscan/' + booklet.fileName)) {
                fs.renameSync(archiveDataDir + 'mastercopyscan/' + booklet.fileName, archiveDataDir + 'mastercopyscan/' + tmpFileName);
              }
            }

            renameList.push({ '_id': booklet._id, 'curr': archiveDataDir + 'mastercopyscan/' + tmpFileName, 'new': archiveDataDir + 'mastercopyscan/' + newFileName });
            await db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(booklet._id) }, { $set: { 'fileName': tmpFileName } });

            // doplnit booklet do seznamu md5 a main_mets itemlistu
            coverChecksum = md5.sync(archiveDataDir + 'mastercopyscan/' + tmpFileName);
            md5File += coverChecksum + ' \\mastercopyscan\\' + newFileName + "\n";
            manifestMd5File += coverChecksum + ' data/mastercopyscan/' + newFileName + "\n";
            itemlist += '        <item>\\mastercopyscan\\' + newFileName + '</item>' + "\n";
            itemcount++;

            //
            // BOOKLET OCR
            //
            ocrTextFileName = 'mcs_' + archiveUuid + '_' + coverSeq + '.txt';
            ocrAltoFileName = 'mcs_' + archiveUuid + '_' + coverSeq + '.xml';
            _log(db, archiveId, '[ OCR bookletu pomoci Abbyy Recognition Server: ' + archiveDataDir+'mastercopyscan/'+tmpFileName + ' ]');
            var ocrTextFileFullPath = archiveDataDir + 'mastercopyscan/' + ocrTextFileName;
            if (fs.existsSync(ocrTextFileFullPath)) {
              fs.unlinkSync(ocrTextFileFullPath);
            }
            var ocrAltoFileFullPath = archiveDataDir + 'mastercopyscan/' + ocrAltoFileName;
            if (fs.existsSync(ocrAltoFileFullPath)) {
              fs.unlinkSync(ocrAltoFileFullPath);
            }
            execCode = execSync(abbyyDir + 'jre1.6.0_45/bin/java -jar ' + abbyyDir + 'ocr-abbyy.jar ' + archiveDataDir+'mastercopyscan/'+tmpFileName + ' ' + archiveDataDir+'mastercopyscan/'+ocrTextFileName + ' ' + archiveDataDir+'mastercopyscan/'+ocrAltoFileName);
            // doplnit OCR TXT do seznamu md5 a main_mets itemlistu
            ocrChecksum = md5.sync(archiveDataDir + 'mastercopyscan/' + ocrTextFileName);
            md5File += ocrChecksum + ' \\mastercopyscan\\' + ocrTextFileName + "\n";
            manifestMd5File += ocrChecksum + ' data/mastercopyscan/' + ocrTextFileName + "\n";
            itemlist += '        <item>\\mastercopyscan\\' + ocrTextFileName + '</item>' + "\n";
            itemcount++;
            // doplnit OCR ALTO do seznamu md5 a main_mets itemlistu
            ocrChecksum = md5.sync(archiveDataDir + 'mastercopyscan/' + ocrAltoFileName);
            md5File += ocrChecksum + ' \\mastercopyscan\\' + ocrAltoFileName + "\n";
            manifestMd5File += ocrChecksum + ' data/mastercopyscan/' + ocrAltoFileName + "\n";
            itemlist += '        <item>\\mastercopyscan\\' + ocrAltoFileName + '</item>' + "\n";
            itemcount++;

            //
            // BOOKLET USER COPY 1:8
            //
            usercopyFileName = 'ucs_' + archiveUuid + '_' + coverSeq;
            _log(db, archiveId, '[ Transformace na JP2: ' + usercopyFileName + '.jp2 ]');
            execCode = execSync('kdu_transcode -i ' + archiveDataDir+'mastercopyscan/'+tmpFileName + ' -o ' + archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c Corder=RPCL "Cprecincts={256,256},{256,256},{128,128}" ORGtparts=R -rate 3 Clayers=12 "Cmodes={BYPASS}"');
            fs.renameSync(archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c', archiveDataDir+'usercopyscan/'+usercopyFileName+'.jp2');
            // doplnit booklet usercopy 1:8 do seznamu md5 a main_mets itemlistu
            coverChecksum = md5.sync(archiveDataDir + 'usercopyscan/' + usercopyFileName + '.jp2');
            md5File += coverChecksum + ' \\usercopyscan\\' + usercopyFileName + '.jp2' + "\n";
            manifestMd5File += coverChecksum + ' data/usercopyscan/' + usercopyFileName + '.jp2' + "\n";
            itemlist += '        <item>\\usercopyscan\\' + usercopyFileName + '.jp2' + '</item>' + "\n";
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
          fs.readdirSync(process.env.DROID_TMP_DIR).forEach(file => {
            fs.copyFileSync(process.env.DROID_TMP_DIR + file, archiveDataDir+'droid_'+archiveUuid+'.xml');
            fs.unlinkSync(process.env.DROID_TMP_DIR + file);
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
        getFolderSize(archiveDir, (err, size) => {
          if (err) { throw err; }
          infoFile = infoFile.replace('###archivesize###', size);
          const infoMd5 = crypto.createHash('md5').update(infoFile, 'utf8').digest('hex');

          manifestMd5File += metsMd5 + ' data/main_mets_' + archiveUuid + '.xml' + "\n";
          manifestMd5File += md5Md5 + ' data/md5_' + archiveUuid + '.md5' + "\n";
          manifestMd5File += infoMd5 + ' data/info_' + archiveUuid + '.xml' + "\n";

          fs.writeFileSync(archiveDataDir + 'main_mets_' + archiveUuid + '.xml', metsFile);
          fs.writeFileSync(archiveDataDir + 'md5_' + archiveUuid + '.md5', md5File);
          fs.writeFileSync(archiveDataDir + 'info_' + archiveUuid + '.xml', infoFile);
          fs.writeFileSync(archiveDir + '/manifest-md5.txt', manifestMd5File);
          fs.writeFileSync(archiveDir + '/bagit.txt', "BagIt-Version: 0.97\nTag-File-Character-Encoding: UTF-8");
        });

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
