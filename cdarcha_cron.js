/// version 1

/// mongodb://url:port/database  - spojeni na mongodb
const urlmongo = 'mongodb://localhost:27017';
const mongodb = 'cdarcha_db';
const archiveCollection = 'archive';
const mediaCollection = 'media';
const userCollection = 'users';
const filesCollection = 'files';
const storageFolder = "/mnt/cdarcha";

// =========================================

const mongo = require('mongodb');
const client = mongo.MongoClient;
const request = require('request');
const fs = require('fs');
const crypto = require('crypto');
const execSync = require('child_process').execSync;
const md5 = require('md5-file');


client.connect(urlmongo, { useNewUrlParser: true }, function (err, client) {
  if (err) { console.dir(err); return; }
  var db = client.db(mongodb);

  db.collection(archiveCollection).find({ status: 1 }).toArray(function(err, archives) {
    if (err) { console.dir(err); return; }

    // rozpracovane archivy na serveru
    for (var i=0; i<archives.length; i++) {
      (function(i) {
        var archive = archives[i];
        console.log('[ ARCHIV: ' + archive._id + '  =  ' + archive.uuid + ' ]');

        var archiveId = archive._id;
        var archiveUuid = archive.uuid;
        var archiveDir = storageFolder + '/' + archiveUuid;
        var archiveDataDir = archiveDir + '/data/';

        // seznam aktualnich nazvu souboru a jejich pozadovany novy nazev
        var renameList = [];

        // date cretion
        var dtCreated = new Date();
        var created = dtCreated.toISOString().substring(0,19);

        // info_UUID.xml
        var infoFile = '', itemlist = '', itemcount = 0;

        // md5_UUID.md5
        var md5File = '', manifestMd5File = '';

        // main_mets_UUID.xml
        var metsFile = '', filesec = '', structlogical = '', structphysical = '';

        // uzivatel - tvurce archivu
        db.collection(userCollection).findOne({ '_id': archive.creator }, function(err, user) {
          if (err) { console.dir(err); return; }

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
          db.collection(filesCollection).findOne({ "archive": mongo.ObjectId(archiveId), "fileType": "cover" }, function(err, cover){
            if (err) { console.dir(err); return; }

            // poradove cislo spracovaneho cover
            var coverNo = 0;

            // nasli sme reprezentativny cover
            if (cover) {
              coverNo = 1;
              var coverSeq = '0001';
              var fileType = cover.fileName.split('.');

              if (fileType[1] != 'jp2') {
                // transformace na jp2
                var tmpFileName = archiveId + '-cover.jp2';
                var newFileName = 'mcs_' + archiveUuid + '_' + coverSeq + '.jp2';
                console.log('[ Transformace na JP2: ' + tmpFileName + ' ]');
                var execCode = execSync('bin/convertTIFtoJP2.pl ' + archiveDataDir+'mastercopyscan/'+cover.fileName + ' ' + archiveDataDir+'mastercopyscan/'+archiveId+'-cover.jp2');
                fs.unlinkSync(archiveDataDir + 'mastercopyscan/' + cover.fileName);
              }
              else {
                // toto je docasny nazov suboru - na pozadovany nazev bude prejmenovan az po prejmenovani vsech medii na docasny nazev
                // kvuli tomu, ze se muze sekvencni cislo skrizit
                var tmpFileName = archiveId + '-cover.jp2';
                var newFileName = 'mcs_' + archiveUuid + '_' + coverSeq + '.jp2';
                if (fs.existsSync(archiveDataDir + 'mastercopyscan/' + cover.fileName)) {
                  fs.renameSync(archiveDataDir + 'mastercopyscan/' + cover.fileName, archiveDataDir + 'mastercopyscan/' + tmpFileName);
                }
              }

              renameList.push({ '_id': cover._id, 'curr': archiveDataDir + 'mastercopyscan/' + tmpFileName, 'new': archiveDataDir + 'mastercopyscan/' + newFileName });
              db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(cover._id) }, { $set: { 'fileName': tmpFileName } });

              // doplnit cover do seznamu md5 a main_mets itemlistu
              var coverChecksum = md5.sync(archiveDataDir + 'mastercopyscan/' + tmpFileName);
              md5File += coverChecksum + ' \\mastercopyscan\\' + newFileName + "\n";
              manifestMd5File += coverChecksum + ' data/mastercopyscan/' + newFileName + "\n";
              itemlist += '        <item>\\mastercopyscan\\' + newFileName + '</item>' + "\n";
              itemcount++;

              // metadata
              db.collection(filesCollection).findOne({ "archive": mongo.ObjectId(archiveId), "fileType": "amdsec-scan-meta" }, function(err, meta){
                if (!err) {
                  var tmpFileName = 'amd_mets_' + meta._id + '.xml';
                  var newFileName = 'amd_mets_' + archiveUuid + '_' + coverSeq + '.xml';
                  if (fs.existsSync(archiveDataDir + 'amdsec/' + meta.fileName)) {
                    fs.renameSync(archiveDataDir + 'amdsec/' + meta.fileName, archiveDataDir + 'amdsec/' + tmpFileName);
                  }
                  renameList.push({ '_id': meta._id, 'curr': archiveDataDir + 'amdsec/' + tmpFileName, 'new': archiveDataDir + 'amdsec/' + newFileName });
                  db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(meta._id) }, { $set: { 'fileName': tmpFileName } });
                  md5File += meta.checkSum + ' \\amdsec\\' + newFileName + "\n";
                  manifestMd5File += meta.checkSum + ' data/amdsec/' + newFileName + "\n";
                  itemlist += '        <item>\\amdsec\\' + newFileName + '</item>' + "\n";
                  itemcount++;
                }
              });

              //
              // COVER USER COPY 1:8
              //
              var usercopyFileName = 'ucs_' + archiveUuid + '_' + coverSeq;
              var execCode = execSync('kdu_transcode -i ' + archiveDataDir+'mastercopyscan/'+tmpFileName + ' -o ' + archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c Corder=RPCL "Cprecincts={256,256},{256,256},{128,128}" ORGtparts=R -rate 3 Clayers=12 "Cmodes={BYPASS}"');
              fs.renameSync(archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c', archiveDataDir+'usercopyscan/'+usercopyFileName+'.jp2');
              // doplnit booklet usercopy 1:8 do seznamu md5 a main_mets itemlistu
              var coverChecksum = md5.sync(archiveDataDir + 'usercopyscan/' + usercopyFileName + '.jp2');
              md5File += coverChecksum + ' \\usercopyscan\\' + usercopyFileName + '.jp2' + "\n";
              manifestMd5File += coverChecksum + ' data/usercopyscan/' + usercopyFileName + '.jp2' + "\n";
              itemlist += '        <item>\\usercopyscan\\' + usercopyFileName + '.jp2' + '</item>' + "\n";
              itemcount++;
            }

            // =========================================
            //   BOOKLET/TOC - reprezentativny
            // =========================================
            db.collection(filesCollection).find({ "archive": mongo.ObjectId(archiveId), "fileType": "toc" }).toArray(function(err, booklets) {
              if (err) { console.dir(err); return; }

              // nasli sme reprezentativny booklet
              for (var b=0; b<booklets.length; b++) {
                var booklet = booklets[b];

                coverNo++;
                var bookletSeq = '000' + (coverNo+1);
                bookletSeq = bookletSeq.substring(bookletSeq.length-4);
                var fileType = booklet.fileName.split('.');

                if (fileType[1] != 'jp2') {
                  // transformace na jp2
                  var tmpFileName = booklet._id + '-booklet.jp2';
                  var newFileName = 'mcs_' + archiveUuid + '_' + bookletSeq + '.jp2';
                  console.log('[ Transformace na JP2: ' + tmpFileName + ' ]');
                  var execCode = execSync('bin/convertTIFtoJP2.pl ' + archiveDataDir+'mastercopyscan/'+booklet.fileName + ' ' + archiveDataDir+'mastercopyscan/'+booklet._id+'-booklet.jp2');
                  fs.unlinkSync(archiveDataDir + 'mastercopyscan/' + booklet.fileName);
                }
                else {
                  // toto je docasny nazov suboru - na pozadovany nazev bude prejmenovan az po prejmenovani vsech medii na docasny nazev
                  // kvuli tomu, ze se muze sekvencni cislo skrizit
                  var tmpFileName = booklet._id + '-booklet.jp2';
                  var newFileName = 'mcs_' + archiveUuid + '_' + bookletSeq + '.jp2';
                  if (fs.existsSync(archiveDataDir + 'mastercopyscan/' + booklet.fileName)) {
                    fs.renameSync(archiveDataDir + 'mastercopyscan/' + booklet.fileName, archiveDataDir + 'mastercopyscan/' + tmpFileName);
                  }
                }

                renameList.push({ '_id': booklet._id, 'curr': archiveDataDir + 'mastercopyscan/' + tmpFileName, 'new': archiveDataDir + 'mastercopyscan/' + newFileName });
                db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(booklet._id) }, { $set: { 'fileName': tmpFileName } });

                // doplnit booklet do seznamu md5 a main_mets itemlistu
                var coverChecksum = md5.sync(archiveDataDir + 'mastercopyscan/' + tmpFileName);
                md5File += coverChecksum + ' \\mastercopyscan\\' + newFileName + "\n";
                manifestMd5File += coverChecksum + ' data/mastercopyscan/' + newFileName + "\n";
                itemlist += '        <item>\\mastercopyscan\\' + newFileName + '</item>' + "\n";
                itemcount++;

                // metadata
                db.collection(filesCollection).findOne({ "archive": mongo.ObjectId(archiveId), "fileType": "amdsec-scan-meta" }, function(err, meta){
                  if (!err) {
                    var tmpFileName = 'amd_mets_' + meta._id + '.xml';
                    var newFileName = 'amd_mets_' + archiveUuid + '_' + bookletSeq + '.xml';
                    if (fs.existsSync(archiveDataDir + 'amdsec/' + meta.fileName)) {
                      fs.renameSync(archiveDataDir + 'amdsec/' + meta.fileName, archiveDataDir + 'amdsec/' + tmpFileName);
                    }
                    renameList.push({ '_id': meta._id, 'curr': archiveDataDir + 'amdsec/' + tmpFileName, 'new': archiveDataDir + 'amdsec/' + newFileName });
                    db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(meta._id) }, { $set: { 'fileName': tmpFileName } });
                    md5File += meta.checkSum + ' \\amdsec\\' + newFileName + "\n";
                    manifestMd5File += meta.checkSum + ' data/amdsec/' + newFileName + "\n";
                    itemlist += '        <item>\\amdsec\\' + newFileName + '</item>' + "\n";
                    itemcount++;
                  }
                });

                //
                // BOOKLET USER COPY 1:8
                //
                var usercopyFileName = 'ucs_' + archiveUuid + '_' + coverSeq;
                var execCode = execSync('kdu_transcode -i ' + archiveDataDir+'mastercopyscan/'+tmpFileName + ' -o ' + archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c Corder=RPCL "Cprecincts={256,256},{256,256},{128,128}" ORGtparts=R -rate 3 Clayers=12 "Cmodes={BYPASS}"');
                fs.renameSync(archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c', archiveDataDir+'usercopyscan/'+usercopyFileName+'.jp2');
                // doplnit booklet usercopy 1:8 do seznamu md5 a main_mets itemlistu
                var coverChecksum = md5.sync(archiveDataDir + 'usercopyscan/' + usercopyFileName + '.jp2');
                md5File += coverChecksum + ' \\usercopyscan\\' + usercopyFileName + '.jp2' + "\n";
                manifestMd5File += coverChecksum + ' data/usercopyscan/' + usercopyFileName + '.jp2' + "\n";
                itemlist += '        <item>\\usercopyscan\\' + usercopyFileName + '.jp2' + '</item>' + "\n";
                itemcount++;
              }


              // =========================================
              //   MEDIA
              // =========================================
              db.collection(mediaCollection).find({ archive: mongo.ObjectId(archiveId) }).sort({ 'mediaNo': 1 }).toArray(function(err, medias) {
                if (err) { console.dir(err); return; }

                for (var j=0; j<medias.length; j++) {
                  (function(j) {
                    var media = medias[j];

                    console.log('[ MEDIA: ' + media._id + ' ]');

                    // prejmenovat soubor media archiveUuid + mediumSeq . iso
                    var mediumSeq = '000' + (j+1);
                    mediumSeq = mediumSeq.substring(mediumSeq.length-4);
                    var tmpFileName = media._id + '.' + media.fileType;
                    var newFileName = archiveUuid + '_' + mediumSeq + '.' + media.fileType;
                    // toto je docasny nazov suboru - na pozadovany nazev bude prejmenovan az po prejmenovani vsech medii na docasny nazev
                    // kvuli tomu, ze se muze sekvencni cislo skrizit
                    fs.renameSync(archiveDataDir + 'isoimage/' + media.fileName, archiveDataDir + 'isoimage/' + tmpFileName);
                    renameList.push({ '_id': media._id, 'curr': archiveDataDir + 'isoimage/' + tmpFileName, 'new': archiveDataDir + 'isoimage/' + newFileName });
                    db.collection(mediaCollection).updateOne({ "_id": mongo.ObjectId(media._id) }, { $set: { 'fileName': tmpFileName } });

                    // doplnit ISO do seznamu md5 a main_mets itemlistu
                    md5File += media.checkSum + ' \\isoimage\\' + newFileName + "\n";
                    manifestMd5File += media.checkSum + ' data/isoimage/' + newFileName + "\n";
                    itemlist += '        <item>\\isoimage\\' + newFileName + '</item>' + "\n";
                    itemcount++;

                    // metadata
                    db.collection(filesCollection).findOne({ "media": mongo.ObjectId(media._id), "fileType": "amdsec-media-meta" }, function(err, meta){
                      if (!err) {
                        console.log('[ MEDIA META: ' + media._id + ' ]');
                        var tmpFileName = 'amd_mets_isoimg_' + meta._id + '.xml';
                        var newFileName = 'amd_mets_isoimg_' + archiveUuid + '_' + mediumSeq + '.xml';
                        if (fs.existsSync(archiveDataDir + 'amdsec/' + meta.fileName)) {
                          fs.renameSync(archiveDataDir + 'amdsec/' + meta.fileName, archiveDataDir + 'amdsec/' + tmpFileName);
                        }
                        renameList.push({ '_id': meta._id, 'curr': archiveDataDir + 'amdsec/' + tmpFileName, 'new': archiveDataDir + 'amdsec/' + newFileName });
                        db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(meta._id) }, { $set: { 'fileName': tmpFileName } });
                        md5File += meta.checkSum + ' \\amdsec\\' + newFileName + "\n";
                        manifestMd5File += meta.checkSum + ' data/amdsec/' + newFileName + "\n";
                        itemlist += '        <item>\\amdsec\\' + newFileName + '</item>' + "\n";
                        itemcount++;
                      }
                    });

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
                    db.collection(filesCollection).find({ "media": mongo.ObjectId(media._id), "fileType": "cover" }).toArray(function(err, covers) {
                      if (err) { console.dir(err); return; }

                      for (var k=0; k<covers.length; k++) {
                        var cover = covers[k];

                        coverNo++;
                        var coverSeq = '000' + coverNo;
                        coverSeq = coverSeq.substring(coverSeq.length-4);
                        var fileType = cover.fileName.split('.');

                        if (fileType[1] != 'jp2') {
                          // transformace na jp2
                          var tmpFileName = cover._id + '-cover.jp2';
                          var newFileName = 'mcs_' + archiveUuid + '_' + coverSeq + '.jp2';
                          console.log('[ Transformace na JP2: ' + tmpFileName + ' ]');
                          var execCode = execSync('bin/convertTIFtoJP2.pl ' + archiveDataDir+'mastercopyscan/'+cover.fileName + ' ' + archiveDataDir+'mastercopyscan/'+cover._id+'-cover.jp2');
                          fs.unlinkSync(archiveDataDir + 'mastercopyscan/' + cover.fileName);
                        }
                        else {
                          // toto je docasny nazov suboru - na pozadovany nazev bude prejmenovan az po prejmenovani vsech medii na docasny nazev
                          // kvuli tomu, ze se muze sekvencni cislo skrizit
                          var tmpFileName = cover._id + '-cover.jp2';
                          var newFileName = 'mcs_' + archiveUuid + '_' + coverSeq + '.jp2';
                          if (fs.existsSync(archiveDataDir + 'mastercopyscan/' + cover.fileName)) {
                            fs.renameSync(archiveDataDir + 'mastercopyscan/' + cover.fileName, archiveDataDir + 'mastercopyscan/' + tmpFileName);
                          }
                        }

                        renameList.push({ '_id': cover._id, 'curr': archiveDataDir + 'mastercopyscan/' + tmpFileName, 'new': archiveDataDir + 'mastercopyscan/' + newFileName });
                        db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(cover._id) }, { $set: { 'fileName': tmpFileName } });

                        // toto je prvni cover archivu = archiv nema reprezentativni cover
                        // ted vytvarime reprezentativni cover
                        if (coverNo === 1) {
                          db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(cover._id) }, { $set: { 'archive': mongo.ObjectId(archiveId) } });
                        }

                        // doplnit cover do seznamu md5 a main_mets itemlistu
                        var coverChecksum = md5.sync(archiveDataDir + 'mastercopyscan/' + tmpFileName);
                        md5File += coverChecksum + ' \\mastercopyscan\\' + newFileName + "\n";
                        manifestMd5File += coverChecksum + ' data/mastercopyscan/' + newFileName + "\n";
                        itemlist += '        <item>\\mastercopyscan\\' + newFileName + '</item>' + "\n";
                        itemcount++;

                        // metadata
                        db.collection(filesCollection).findOne({ "media": mongo.ObjectId(media._id), "fileType": "amdsec-scan-meta" }, function(err, meta){
                          if (!err) {
                            var tmpFileName = 'amd_mets_' + meta._id + '.xml';
                            var newFileName = 'amd_mets_' + archiveUuid + '_' + coverSeq + '.xml';
                            if (fs.existsSync(archiveDataDir + 'amdsec/' + meta.fileName)) {
                              fs.renameSync(archiveDataDir + 'amdsec/' + meta.fileName, archiveDataDir + 'amdsec/' + tmpFileName);
                            }
                            renameList.push({ '_id': meta._id, 'curr': archiveDataDir + 'amdsec/' + tmpFileName, 'new': archiveDataDir + 'amdsec/' + newFileName });
                            db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(meta._id) }, { $set: { 'fileName': tmpFileName } });
                            manifestMd5File += meta.checkSum + ' data/amdsec/' + newFileName + "\n";
                            itemlist += '        <item>\\amdsec\\' + newFileName + '</item>' + "\n";
                            itemcount++;
                          }
                        });

                        //
                        // COVER USER COPY 1:8
                        //
                        var usercopyFileName = 'ucs_' + archiveUuid + '_' + coverSeq;
                        var execCode = execSync('kdu_transcode -i ' + archiveDataDir+'mastercopyscan/'+tmpFileName + ' -o ' + archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c Corder=RPCL "Cprecincts={256,256},{256,256},{128,128}" ORGtparts=R -rate 3 Clayers=12 "Cmodes={BYPASS}"');
                        fs.renameSync(archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c', archiveDataDir+'usercopyscan/'+usercopyFileName+'.jp2');
                        // doplnit booklet usercopy 1:8 do seznamu md5 a main_mets itemlistu
                        var coverChecksum = md5.sync(archiveDataDir + 'usercopyscan/' + usercopyFileName + '.jp2');
                        md5File += coverChecksum + ' \\usercopyscan\\' + usercopyFileName + '.jp2' + "\n";
                        manifestMd5File += coverChecksum + ' data/usercopyscan/' + usercopyFileName + '.jp2' + "\n";
                        itemlist += '        <item>\\usercopyscan\\' + usercopyFileName + '.jp2' + '</item>' + "\n";
                        itemcount++;
                      }

                      // =======================================================
                      //   BOOKLET
                      // =======================================================
                      db.collection(filesCollection).find({ "media": mongo.ObjectId(media._id), "fileType": "toc" }).toArray(function(err, booklets) {
                        if (err) { console.dir(err); return; }

                        for (var k=0; k<booklets.length; k++) {
                          var booklet = booklets[k];

                          coverNo++;
                          var coverSeq = '000' + coverNo;
                          coverSeq = coverSeq.substring(coverSeq.length-4);
                          var fileType = booklet.fileName.split('.');

                          if (fileType[1] != 'jp2') {
                            // transformace na jp2
                            var tmpFileName = booklet._id + '-booklet.jp2';
                            var newFileName = 'mcs_' + archiveUuid + '_' + coverSeq + '.jp2';
                            console.log('[ Transformace na JP2: ' + tmpFileName + ' ]');
                            var execCode = execSync('bin/convertTIFtoJP2.pl ' + archiveDataDir+'mastercopyscan/'+booklet.fileName + ' ' + archiveDataDir+'mastercopyscan/'+booklet._id+'-booklet.jp2');
                            fs.unlinkSync(archiveDataDir + 'mastercopyscan/' + booklet.fileName);
                          }
                          else {
                            // toto je docasny nazov suboru - na pozadovany nazev bude prejmenovan az po prejmenovani vsech medii na docasny nazev
                            // kvuli tomu, ze se muze sekvencni cislo skrizit
                            var tmpFileName = booklet._id + '-booklet.jp2';
                            var newFileName = 'mcs_' + archiveUuid + '_' + coverSeq + '.jp2';
                            if (fs.existsSync(archiveDataDir + 'mastercopyscan/' + booklet.fileName)) {
                              fs.renameSync(archiveDataDir + 'mastercopyscan/' + booklet.fileName, archiveDataDir + 'mastercopyscan/' + tmpFileName);
                            }
                          }

                          renameList.push({ '_id': booklet._id, 'curr': archiveDataDir + 'mastercopyscan/' + tmpFileName, 'new': archiveDataDir + 'mastercopyscan/' + newFileName });
                          db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(booklet._id) }, { $set: { 'fileName': tmpFileName } });

                          // doplnit booklet do seznamu md5 a main_mets itemlistu
                          var coverChecksum = md5.sync(archiveDataDir + 'mastercopyscan/' + tmpFileName);
                          md5File += coverChecksum + ' \\mastercopyscan\\' + newFileName + "\n";
                          manifestMd5File += coverChecksum + ' data/mastercopyscan/' + newFileName + "\n";
                          itemlist += '        <item>\\mastercopyscan\\' + newFileName + '</item>' + "\n";
                          itemcount++;

                          // metadata
                          db.collection(filesCollection).findOne({ "media": mongo.ObjectId(media._id), "fileType": "amdsec-scan-meta" }, function(err, meta){
                            if (!err) {
                              var tmpFileName = 'amd_mets_' + meta._id + '.xml';
                              var newFileName = 'amd_mets_' + archiveUuid + '_' + coverSeq + '.xml';
                              if (fs.existsSync(archiveDataDir + 'amdsec/' + meta.fileName)) {
                                fs.renameSync(archiveDataDir + 'amdsec/' + meta.fileName, archiveDataDir + 'amdsec/' + tmpFileName);
                              }
                              renameList.push({ '_id': meta._id, 'curr': archiveDataDir + 'amdsec/' + tmpFileName, 'new': archiveDataDir + 'amdsec/' + newFileName });
                              db.collection(filesCollection).updateOne({ "_id": mongo.ObjectId(meta._id) }, { $set: { 'fileName': tmpFileName } });
                              md5File += meta.checkSum + ' \\amdsec\\' + newFileName + "\n";
                              manifestMd5File += meta.checkSum + ' data/amdsec/' + newFileName + "\n";
                              itemlist += '        <item>\\amdsec\\' + newFileName  + '</item>' + "\n";
                              itemcount++;
                            }
                          });

                          //
                          // BOOKLET USER COPY 1:8
                          //
                          var usercopyFileName = 'ucs_' + archiveUuid + '_' + coverSeq;
                          var execCode = execSync('kdu_transcode -i ' + archiveDataDir+'mastercopyscan/'+tmpFileName + ' -o ' + archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c Corder=RPCL "Cprecincts={256,256},{256,256},{128,128}" ORGtparts=R -rate 3 Clayers=12 "Cmodes={BYPASS}"');
                          fs.renameSync(archiveDataDir+'usercopyscan/'+usercopyFileName+'.j2c', archiveDataDir+'usercopyscan/'+usercopyFileName+'.jp2');
                          // doplnit booklet usercopy 1:8 do seznamu md5 a main_mets itemlistu
                          var coverChecksum = md5.sync(archiveDataDir + 'usercopyscan/' + usercopyFileName + '.jp2');
                          md5File += coverChecksum + ' \\usercopyscan\\' + usercopyFileName + '.jp2' + "\n";
                          manifestMd5File += coverChecksum + ' data/usercopyscan/' + usercopyFileName + '.jp2' + "\n";
                          itemlist += '        <item>\\usercopyscan\\' + usercopyFileName + '.jp2' + '</item>' + "\n";
                          itemcount++;
                        }


                        // =====================================================
                        //   WRITE
                        // =====================================================
                        if (medias.length == j+1) {
                          console.log('prepare.write');

                          // ===================================================
                          //   DROID
                          // ===================================================
                          execSync('./bin/droid-6.4/droid.sh -a ' + archiveDataDir+'isoimage -p ' + archiveDataDir+'droid.profile');
                          execSync('./bin/droid-6.4/droid.sh -p ' + archiveDataDir+'droid.profile -e ' + archiveDataDir+'droid_'+archiveUuid+'.csv');
                          fs.unlinkSync(archiveDataDir + 'droid.profile');
                          var droidChecksum = md5.sync(archiveDataDir + 'droid_' + archiveUuid + '.csv');
                          md5File += droidChecksum + ' \\' + 'droid_' + archiveUuid + '.csv' + "\n";
                          manifestMd5File += droidChecksum + ' data/' + 'droid_' + archiveUuid + '.csv' + "\n";
                          itemlist += '        <item>\\' + 'droid_' + archiveUuid + '.csv' + '</item>' + "\n";
                          itemcount++;

                          // todo: STRUCT MAP
                          metsFile = metsFile.replace('###filesec###', filesec);
                          metsFile = metsFile.replace('###structlogical###', structlogical);
                          metsFile = metsFile.replace('###structphysical###', structphysical);

                          fs.readFile(archiveDataDir + 'dmdsec/dmd_mods_' + archiveUuid + '.xml', function (err, dataMods) {
                            if (err) { console.dir(err); return; }
                            metsFile = metsFile.replace('###mods###', dataMods);
                            const metsMd5 = crypto.createHash('md5').update(metsFile, 'utf8').digest('hex');

                            md5File += metsMd5 + ' \\main_mets_' + archiveUuid + '.xml' + "\n";
                            manifestMd5File += metsMd5 + ' data/main_mets_' + archiveUuid + '.xml' + "\n";
                            const md5Md5 = crypto.createHash('md5').update(md5File, 'utf8').digest('hex');

                            fs.writeFileSync(archiveDataDir + 'main_mets_' + archiveUuid + '.xml', metsFile);
                            fs.writeFileSync(archiveDataDir + 'md5_' + archiveUuid + '.md5', md5File);
                            fs.writeFileSync(archiveDir + '/manifest-md5.txt', manifestMd5File);
                            fs.writeFileSync(archiveDir + '/bagit.txt', "BagIt-Version: 0.97\nTag-File-Character-Encoding: UTF-8");

                            itemlist += '        <item>\\main_mets_' + archiveUuid + '.' + media.fileType + '</item>' + "\n";
                            itemcount++;
                            itemlist += '        <item>\\md5_' + archiveUuid + '.md5</item>';
                            itemcount++;
                            infoFile = infoFile.replace('###itemlist###', itemlist);
                            infoFile = infoFile.replace('###md5sum###', md5Md5);
                            infoFile = infoFile.replace('###itemtotal###', itemcount);
                            console.log('------------------------------------------');
                            console.log(infoFile);
                            console.log('------------------------------------------');

                            fs.writeFileSync(archiveDataDir + 'info_' + archiveUuid + '.xml', infoFile);

                            // =================================================
                            //   RENAME
                            // =================================================

                            for (var ri=0; ri<renameList.length; ri++) {
                              var renameItem = renameList[ri];
                              if (fs.existsSync(renameItem.curr)) {
                                fs.renameSync(renameItem.curr, renameItem.new);
                                var collectionFileNameSplitted = renameItem.new.split('/');
                                var collectionFileName = collectionFileNameSplitted[collectionFileNameSplitted.length-1];
                                console.log(renameItem.curr.indexOf('/isoimage/')>-1 ? mediaCollection : filesCollection);
                                console.log(renameItem._id);
                                console.log(renameItem.curr);
                                console.log(collectionFileName);
                                console.log('------');
                                db.collection(renameItem.curr.indexOf('/isoimage/')>-1 ? mediaCollection : filesCollection).updateOne({ _id: renameItem._id }, { $set: { fileName: collectionFileName } });
                              } else {
                                console.log('!!! ' + renameItem.curr);
                                console.log('------');
                              }
                            }

                            // =================================================
                            //   KONEC
                            // =================================================

                            if (archives.length == i+1) {
                              client.close();
                            }
                          }); // read dmd_mods
                        } // write

                      }); // db booklet

                    }); // db cover

                  })(j); // anonymni funkce pro media

                } // loop media

              }); // db media

              // =========================================
              //   TXT
              // =========================================
              /*const txtDir = archiveDataDir + '/txt';
              if (!fs.existsSync(txtDir)) {
                  fs.mkdirSync(txtDir);
              }
              exec("ls -la", function(err, stdout, stderr) {
                if (err) { console.dir(err); return; }

                console.log(stdout);
              });*/

            }); // reprezentativny booklet

          }); // reprezentativny cover

        });

      })(i); // anonymni fuknce pro archive

    }

  });
});
