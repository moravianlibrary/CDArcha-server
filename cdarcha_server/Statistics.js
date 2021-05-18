"use strict";
// ====================== STATISTICS.TS ===================
exports.__esModule = true;
exports.Statistics = void 0;
var metaCollection = "biblio";
var Statistics = /** @class */ (function () {
    function Statistics() {
    }
    Statistics.addEtagFileMatch = function (sigla) {
        this.etagFileMatch[sigla]++ || (this.etagFileMatch[sigla] = 1);
        if (sigla != 'admin')
            this.etagFileMatch.admin++ || (this.etagFileMatch.admin = 1);
    };
    Statistics.addEtagTocPdfMatch = function (sigla) {
        this.etagTocPdfMatch[sigla]++ || (this.etagTocPdfMatch[sigla] = 1);
        if (sigla != 'admin')
            this.etagTocPdfMatch.admin++ || (this.etagTocPdfMatch.admin = 1);
    };
    Statistics.addEtagTocThumbMatch = function (sigla) {
        this.etagTocThumbMatch[sigla]++ || (this.etagTocThumbMatch[sigla] = 1);
        if (sigla != 'admin')
            this.etagTocThumbMatch.admin++ || (this.etagTocThumbMatch.admin = 1);
    };
    Statistics.addEtagCoverMatch = function (sigla) {
        this.etagCoverMatch[sigla]++ || (this.etagCoverMatch[sigla] = 1);
        if (sigla != 'admin')
            this.etagCoverMatch.admin++ || (this.etagCoverMatch.admin = 1);
    };
    Statistics.addFileRequests = function (sigla) {
        this.fileRequests[sigla]++ || (this.fileRequests[sigla] = 1);
        if (sigla != 'admin')
            this.fileRequests.admin++ || (this.fileRequests.admin = 1);
    };
    Statistics.addFileMasterRequests = function (sigla) {
        this.fileMasterRequests[sigla]++ || (this.fileMasterRequests[sigla] = 1);
        if (sigla != 'admin')
            this.fileMasterRequests.admin++ || (this.fileMasterRequests.admin = 1);
    };
    Statistics.addCoverRequests = function (sigla) {
        this.coverRequests[sigla]++ || (this.coverRequests[sigla] = 1);
        if (sigla != 'admin')
            this.coverRequests.admin++ || (this.coverRequests.admin = 1);
    };
    Statistics.addTocThumbnailRequests = function (sigla) {
        this.tocThumbnailRequests[sigla]++ || (this.tocThumbnailRequests[sigla] = 1);
        if (sigla != 'admin')
            this.tocThumbnailRequests.admin++ || (this.tocThumbnailRequests.admin = 1);
    };
    Statistics.addTocPdfRequests = function (sigla) {
        this.tocPdfRequests[sigla]++ || (this.tocPdfRequests[sigla] = 1);
        if (sigla != 'admin')
            this.tocPdfRequests.admin++ || (this.tocPdfRequests.admin = 1);
    };
    Statistics.addCoverApiRequests = function (sigla) {
        this.coverApiRequests[sigla]++ || (this.coverApiRequests[sigla] = 1);
        if (sigla != 'admin')
            this.coverApiRequests.admin++ || (this.coverApiRequests.admin = 1);
    };
    Statistics.addTocThumbnailApiRequests = function (sigla) {
        this.tocThumbnailApiRequests[sigla]++ || (this.tocThumbnailApiRequests[sigla] = 1);
        if (sigla != 'admin')
            this.tocThumbnailApiRequests.admin++ || (this.tocThumbnailApiRequests.admin = 1);
    };
    Statistics.addTocPdfApiRequests = function (sigla) {
        this.tocPdfApiRequests[sigla]++ || (this.tocPdfApiRequests[sigla] = 1);
        if (sigla != 'admin')
            this.tocPdfApiRequests.admin++ || (this.tocPdfApiRequests.admin = 1);
    };
    Statistics.addMetaRequests = function (sigla) {
        this.metaRequests[sigla]++ || (this.metaRequests[sigla] = 1);
        if (sigla != 'admin')
            this.metaRequests.admin++ || (this.metaRequests.admin = 1);
    };
    Statistics.addMetaAuthRequests = function (sigla) {
        this.metaAuthRequests[sigla]++ || (this.metaAuthRequests[sigla] = 1);
        if (sigla != 'admin')
            this.metaAuthRequests.admin++ || (this.metaAuthRequests.admin = 1);
    };
    Statistics.addTocThumbnailRemoves = function () {
        this.tocThumbnailRemoves++;
    };
    Statistics.addCoverRemoves = function () {
        this.coverRemoves++;
    };
    Statistics.addMetaRemoves = function () {
        this.metaRemoves++;
    };
    Statistics.addMetaAuthRemoves = function () {
        this.metaAuthRemoves++;
    };
    Statistics.addMetaFetches = function (sigla) {
        this.metaFetches[sigla]++ || (this.metaFetches[sigla] = 1);
        if (sigla != 'admin')
            this.metaFetches.admin++ || (this.metaFetches.admin = 1);
    };
    Statistics.addMetaAuthFetches = function (sigla) {
        this.metaAuthFetches[sigla]++ || (this.metaAuthFetches[sigla] = 1);
        if (sigla != 'admin')
            this.metaAuthFetches.admin++ || (this.metaAuthFetches.admin = 1);
    };
    Statistics.addTimeoutCount = function (sigla) {
        this.timeoutCount[sigla]++ || (this.timeoutCount[sigla] = 1);
        if (sigla != 'admin')
            this.timeoutCount.admin++ || (this.timeoutCount.admin = 1);
    };
    Statistics.addCoverNotfound = function (sigla) {
        this.coverNotfound[sigla]++ || (this.coverNotfound[sigla] = 1);
        if (sigla != 'admin')
            this.coverNotfound.admin++ || (this.coverNotfound.admin = 1);
    };
    Statistics.addTocThumbnailNotfound = function (sigla) {
        this.tocThumbnailNotfound[sigla]++ || (this.tocThumbnailNotfound[sigla] = 1);
        if (sigla != 'admin')
            this.tocThumbnailNotfound.admin++ || (this.tocThumbnailNotfound.admin = 1);
    };
    Statistics.addTocPdfNotfound = function (sigla) {
        this.tocPdfNotfound[sigla]++ || (this.tocPdfNotfound[sigla] = 1);
        if (sigla != 'admin')
            this.tocPdfNotfound.admin++ || (this.tocPdfNotfound.admin = 1);
    };
    Statistics.addCoverFetches = function (sigla) {
        this.coverFetches[sigla]++ || (this.coverFetches[sigla] = 1);
        if (sigla != 'admin')
            this.coverFetches.admin++ || (this.coverFetches.admin = 1);
    };
    Statistics.addTocThumbnailFetches = function (sigla) {
        this.tocThumbnailFetches[sigla]++ || (this.tocThumbnailFetches[sigla] = 1);
        if (sigla != 'admin')
            this.tocThumbnailFetches.admin++ || (this.tocThumbnailFetches.admin = 1);
    };
    //specialne
    Statistics.addEtagStatisticByEtagPrefix = function (etagPrefix, sigla) {
        if (etagPrefix === 'file') {
            this.addEtagFileMatch(sigla);
        }
        else if (etagPrefix === 'tocp') {
            this.addEtagTocPdfMatch(sigla);
        }
        else if (etagPrefix === 'toct') {
            this.addEtagTocThumbMatch(sigla);
        }
        else {
            this.addEtagCoverMatch(sigla);
        }
    };
    Statistics.getStatisticsBySigla = function (s, sigla) {
        var stats = {};
        stats.uptime = this.uptime();
        stats.etag_match = this.etagCoverMatch[sigla] || 0;
        stats.etag_toc_pdf_match = this.etagTocPdfMatch[sigla] || 0;
        stats.etag_toc_thumbnail_match = this.etagTocThumbMatch[sigla] || 0;
        stats.etag_file_match = this.etagFileMatch[sigla] || 0;
        stats.file_requests = this.fileRequests[sigla] || 0;
        stats.file_master_requests = this.fileMasterRequests[sigla] || 0;
        stats.timeout_count = this.timeoutCount[sigla] || 0;
        stats.meta_requests = this.metaRequests[sigla] || 0;
        stats.meta_fetches = this.metaFetches[sigla] || 0;
        stats.cover_requests = this.coverRequests[sigla] || 0;
        stats.cover_api_requests = this.coverApiRequests[sigla] || 0;
        stats.cover_fetches = this.coverFetches[sigla] || 0;
        stats.cover_notfound = this.coverNotfound[sigla] || 0;
        stats.toc_thumbnail_requests = this.tocThumbnailRequests[sigla] || 0;
        stats.toc_thumbnail_api_requests = this.tocThumbnailApiRequests[sigla] || 0;
        stats.toc_thumbnail_fetches = this.tocThumbnailFetches[sigla] || 0;
        stats.toc_thumbnail_notfound = this.tocThumbnailNotfound[sigla] || 0;
        stats.toc_pdf_requests = this.tocPdfRequests[sigla] || 0;
        stats.toc_pdf_api_requests = this.tocPdfApiRequests[sigla] || 0;
        stats.toc_pdf_notfound = this.tocPdfNotfound[sigla] || 0;
        stats.meta_removes = this.metaRemoves;
        stats.cover_removes = this.coverRemoves;
        stats.toc_thumbnail_removes = this.tocThumbnailRemoves;
        s.db.collection(metaCollection).count(function (err, metaCount) {
            s.db.collection('cover').count(function (err, coverCount) {
                s.db.collection('logs').count(function (err, logsCount) {
                    stats.meta_count = metaCount;
                    stats.cover_count = coverCount;
                    stats.logs_count = logsCount;
                    if (s.query.save === 'true') {
                        stats.timeout_count = this.timeoutCount;
                        stats.meta_requests = this.metaRequests;
                        stats.meta_fetches = this.metaFetches;
                        stats.cover_requests = this.coverRequests;
                        stats.cover_api_requests = this.coverApiRequests;
                        stats.cover_fetches = this.coverFetches;
                        stats.cover_notfound = this.coverNotfound;
                        stats.toc_thumbnail_requests = this.tocThumbnailRequests;
                        stats.toc_thumbnail_api_requests = this.tocThumbnailApiRequests;
                        stats.toc_thumbnail_fetches = this.tocThumbnailFetches;
                        stats.toc_thumbnail_notfound = this.tocThumbnailNotfound;
                        stats.toc_pdf_requests = this.tocPdfRequests;
                        stats.toc_pdf_api_requests = this.tocPdfApiRequests;
                        stats.toc_pdf_notfound = this.tocPdfNotfound;
                        stats.file_master_requests = this.fileMasterRequests;
                        stats.ip = s.remoteIP;
                        stats.timestamp = s.timestamp;
                        s.db.collection('stat').insert(stats, { w: 0 });
                    }
                    s.response.writeHead(200);
                    s.response.end(JSON.stringify(stats, null, ' '));
                });
            });
        });
    };
    Statistics.clearData = function () {
        this.timeoutCount = {};
        this.etagCoverMatch = {};
        this.etagTocPdfMatch = {};
        this.etagTocThumbMatch = {};
        this.etagFileMatch = {};
        this.fileRequests = {};
        this.fileOrigRequests = {};
        this.metaRequests = {};
        this.metaFetches = {};
        this.metaRemoves = 0;
        this.metaAuthRequests = {};
        this.metaAuthFetches = {};
        this.metaAuthRemoves = 0;
        this.coverRequests = {};
        this.coverApiRequests = {};
        this.coverFetches = {};
        this.coverNotfound = {};
        this.coverRemoves = 0;
        this.tocThumbnailRequests = {};
        this.tocThumbnailApiRequests = {};
        this.tocThumbnailFetches = {};
        this.tocThumbnailNotfound = {};
        this.tocThumbnailRemoves = 0;
        this.tocPdfRequests = {};
        this.tocPdfApiRequests = {};
        this.tocPdfNotfound = {};
    };
    Statistics.uptime = function () {
        var now = new Date();
        var uptime = Math.floor((now.getTime() - this.dateStartup.getTime()) / 1000);
        var sec = uptime % 60;
        uptime -= sec;
        uptime /= 60;
        var min = uptime % 60;
        uptime -= min;
        uptime /= 60;
        var hour = uptime % 24;
        uptime -= hour;
        uptime /= 24;
        now.setHours(hour, min, sec);
        var time = now.toString().split(' ')[4];
        // 00:02:51 up 0 days, 2013-12-06T08:35:21.962Z
        return time + ' up ' + uptime + ' days, ' + this.dateStartup.toISOString();
    };
    Statistics.etagCoverMatch = {}; // pocet dotazu na obalku kesovanych prohlizecem od spusteni
    Statistics.etagFileMatch = {}; // pocet dotazu na favicon, obalky-custom.js atd., kesovanych prohlizecem od spusteni
    Statistics.etagTocPdfMatch = {}; // pocet dotazu na TOC PDF, kesovanych prohlizecem od spusteni
    Statistics.etagTocThumbMatch = {}; // pocet dotazu na TOC nahled, kesovanych prohlizecem od spusteni
    Statistics.fileRequests = {}; // pocet dotazu na favicon, obalky-custom.js, atd.
    Statistics.fileMasterRequests = {}; // pocet dotazu na favicon, obalky-custom.js, atd.
    Statistics.metaRequests = {}; // pocet dotazu na metadata od spusteni
    Statistics.metaFetches = {}; // pocet nacteni metadat z backendu od spusteni
    Statistics.metaRemoves = 0; // pocet smazanych metadat z backendu od spusteni
    Statistics.metaAuthRequests = {}; // pocet dotazu na metadata od spusteni
    Statistics.metaAuthFetches = {}; // pocet nacteni metadat z backendu od spusteni
    Statistics.metaAuthRemoves = 0; // pocet smazanych metadat z backendu od spusteni
    Statistics.coverRequests = {}; // pocet dotazu obalky pres urlCoverFile od spusteni
    Statistics.coverApiRequests = {}; // pocet dotazu obalky pres urlCoverApi od spusteni
    Statistics.coverFetches = {}; // pocet nacteni obalky z backendu od spusteni
    Statistics.coverNotfound = {}; // pocet nenalezenych obalek z backendu od spusteni
    Statistics.coverRemoves = 0; // pocet smazanych obalek z backendu od spusteni
    Statistics.tocThumbnailRequests = {}; // pocet dotazu TOC nahledu pres urlTocFile thumbnail (/file/toc/xxxxxx/thumbnail) od spusteni
    Statistics.tocThumbnailApiRequests = {}; // pocet dotazu TOC nahledu pres urlTocApi thumbnail od spusteni
    Statistics.tocThumbnailFetches = {}; // pocet nacteni TOC nahledu z backendu od spusteni
    Statistics.tocThumbnailNotfound = {}; // pocet nenalezenych TOC nahledu z backendu od spusteni
    Statistics.tocThumbnailRemoves = 0; // pocet smazanych TOC nahledu z backendu od spusteni
    Statistics.tocPdfRequests = {}; // pocet dotazu na TOC dokumenty pres urlTocFile thumbnail (/file/toc/xxxxxx/thumbnail) od spusteni
    Statistics.tocPdfApiRequests = {}; // pocet dotazu na TOC dokumenty pres urlTocApiThumbnail od spusteni
    Statistics.tocPdfNotfound = {}; // pocet nenalezenych na TOC dokumenty z backendu od spusteni
    Statistics.timeoutCount = {}; // pocet timeout nedostupnosti backendu od spusteni
    Statistics.authMetaRequests = {}; // pocet dotazu na auth metadata od spusteni
    Statistics.authMetaFetches = {}; // pocet nacteni auth metadat z backendu od spusteni
    Statistics.authCoverApiRequests = {}; // pocet dotazu obalky pres urlAuthCover od spusteni
    Statistics.dateTimeout = 0; // cas do kdy je platny timeout
    Statistics.dateStartup = new Date(); // doba startu
    return Statistics;
}());
exports.Statistics = Statistics;
