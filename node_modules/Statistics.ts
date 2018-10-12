// ====================== STATISTICS.TS ===================

var metaCollection: string = "biblio";

export interface Stats {
    uptime: any;
    etag_match: any;
    etag_toc_pdf_match: any;
    etag_toc_thumbnail_match: any;
    etag_file_match: any;
    file_requests: any;
    timeout_count: any;
    meta_requests: any;
    meta_fetches: any;
    cover_requests: any;
    cover_api_requests: any;
    cover_api: any;
    cover_fetches: any;
    cover_notfound: any;
    toc_thumbnail_requests: any;
    toc_thumbnail_api_requests: any;
    toc_thumbnail_fetches: any;
    toc_thumbnail_notfound: any;
    toc_pdf_requests: any;
    toc_pdf_api_requests: any;
    toc_pdf_notfound: any;
    meta_removes: any;
    cover_removes: any;
    toc_thumbnail_removes: any;

    meta_count: any;
    cover_count: any;
    logs_count: any;
    timestamp: any;
    ip: any;
}


export class Statistics {

    static etagCoverMatch: any = {}; // pocet dotazu na obalku kesovanych prohlizecem od spusteni
    static etagFileMatch: any = {}; // pocet dotazu na favicon, obalky-custom.js atd., kesovanych prohlizecem od spusteni
    static etagTocPdfMatch: any = {}; // pocet dotazu na TOC PDF, kesovanych prohlizecem od spusteni
    static etagTocThumbMatch: any = {}; // pocet dotazu na TOC nahled, kesovanych prohlizecem od spusteni
    static fileRequests: any = {}; // pocet dotazu na favicon, obalky-custom.js, atd.
    static fileMasterRequests: any = {}; // pocet dotazu na favicon, obalky-custom.js, atd.
    static metaRequests: any = {}; // pocet dotazu na metadata od spusteni
    static metaFetches: any = {}; // pocet nacteni metadat z backendu od spusteni
    static metaRemoves: any = 0; // pocet smazanych metadat z backendu od spusteni
    static metaAuthRequests: any = {}; // pocet dotazu na metadata od spusteni
    static metaAuthFetches: any = {}; // pocet nacteni metadat z backendu od spusteni
    static metaAuthRemoves: any = 0; // pocet smazanych metadat z backendu od spusteni
    static coverRequests: any = {}; // pocet dotazu obalky pres urlCoverFile od spusteni
    static coverApiRequests: any = {}; // pocet dotazu obalky pres urlCoverApi od spusteni
    static coverFetches: any = {}; // pocet nacteni obalky z backendu od spusteni
    static coverNotfound: any = {}; // pocet nenalezenych obalek z backendu od spusteni
    static coverRemoves: any = 0; // pocet smazanych obalek z backendu od spusteni
    static tocThumbnailRequests: any = {}; // pocet dotazu TOC nahledu pres urlTocFile thumbnail (/file/toc/xxxxxx/thumbnail) od spusteni
    static tocThumbnailApiRequests: any = {}; // pocet dotazu TOC nahledu pres urlTocApi thumbnail od spusteni
    static tocThumbnailFetches: any = {}; // pocet nacteni TOC nahledu z backendu od spusteni
    static tocThumbnailNotfound: any = {}; // pocet nenalezenych TOC nahledu z backendu od spusteni
    static tocThumbnailRemoves: any = 0; // pocet smazanych TOC nahledu z backendu od spusteni
    static tocPdfRequests: any = {}; // pocet dotazu na TOC dokumenty pres urlTocFile thumbnail (/file/toc/xxxxxx/thumbnail) od spusteni
    static tocPdfApiRequests: any = {}; // pocet dotazu na TOC dokumenty pres urlTocApiThumbnail od spusteni
    static tocPdfNotfound: any = {}; // pocet nenalezenych na TOC dokumenty z backendu od spusteni
    static timeoutCount: any = {}; // pocet timeout nedostupnosti backendu od spusteni
    static authMetaRequests: any = {}; // pocet dotazu na auth metadata od spusteni
    static authMetaFetches: any = {}; // pocet nacteni auth metadat z backendu od spusteni
    static authCoverApiRequests: any = {}; // pocet dotazu obalky pres urlAuthCover od spusteni

    static dateTimeout: any = 0; // cas do kdy je platny timeout
    static dateStartup: any = new Date(); // doba startu

    static addEtagFileMatch(sigla: any) {
        this.etagFileMatch[sigla]++ || (this.etagFileMatch[sigla] = 1);
        if (sigla != 'admin') this.etagFileMatch.admin++ || (this.etagFileMatch.admin = 1);
    }

    static addEtagTocPdfMatch(sigla: any) {
        this.etagTocPdfMatch[sigla]++ || (this.etagTocPdfMatch[sigla] = 1);
        if (sigla != 'admin') this.etagTocPdfMatch.admin++ || (this.etagTocPdfMatch.admin = 1);
    }

    static addEtagTocThumbMatch(sigla: any) {
        this.etagTocThumbMatch[sigla]++ || (this.etagTocThumbMatch[sigla] = 1);
        if (sigla != 'admin') this.etagTocThumbMatch.admin++ || (this.etagTocThumbMatch.admin = 1);
    }

    static addEtagCoverMatch(sigla: any) {
        this.etagCoverMatch[sigla]++ || (this.etagCoverMatch[sigla] = 1);
        if (sigla != 'admin') this.etagCoverMatch.admin++ || (this.etagCoverMatch.admin = 1);
    }

    static addFileRequests(sigla: any) {
        this.fileRequests[sigla]++ || (this.fileRequests[sigla] = 1);
        if (sigla != 'admin') this.fileRequests.admin++ || (this.fileRequests.admin = 1);
    }

    static addFileMasterRequests(sigla: any) {
        this.fileMasterRequests[sigla]++ || (this.fileMasterRequests[sigla] = 1);
        if (sigla != 'admin') this.fileMasterRequests.admin++ || (this.fileMasterRequests.admin = 1);
    }

    static addCoverRequests(sigla: any) {
        this.coverRequests[sigla]++ || (this.coverRequests[sigla] = 1);
        if (sigla != 'admin') this.coverRequests.admin++ || (this.coverRequests.admin = 1);
    }

    static addTocThumbnailRequests(sigla: any) {
        this.tocThumbnailRequests[sigla]++ || (this.tocThumbnailRequests[sigla] = 1);
        if (sigla != 'admin') this.tocThumbnailRequests.admin++ || (this.tocThumbnailRequests.admin = 1);
    }

    static addTocPdfRequests(sigla: any) {
        this.tocPdfRequests[sigla]++ || (this.tocPdfRequests[sigla] = 1);
        if (sigla != 'admin') this.tocPdfRequests.admin++ || (this.tocPdfRequests.admin = 1);
    }

    static addCoverApiRequests(sigla: any) {
        this.coverApiRequests[sigla]++ || (this.coverApiRequests[sigla] = 1);
        if (sigla != 'admin') this.coverApiRequests.admin++ || (this.coverApiRequests.admin = 1);
    }

    static addTocThumbnailApiRequests(sigla: any) {
        this.tocThumbnailApiRequests[sigla]++ || (this.tocThumbnailApiRequests[sigla] = 1);
        if (sigla != 'admin') this.tocThumbnailApiRequests.admin++ || (this.tocThumbnailApiRequests.admin = 1);
    }

    static addTocPdfApiRequests(sigla: any) {
        this.tocPdfApiRequests[sigla]++ || (this.tocPdfApiRequests[sigla] = 1);
        if (sigla != 'admin') this.tocPdfApiRequests.admin++ || (this.tocPdfApiRequests.admin = 1);
    }

    static addMetaRequests(sigla: any) {
        this.metaRequests[sigla]++ || (this.metaRequests[sigla] = 1);
        if (sigla != 'admin') this.metaRequests.admin++ || (this.metaRequests.admin = 1);
    }

    static addMetaAuthRequests(sigla: any) {
        this.metaAuthRequests[sigla]++ || (this.metaAuthRequests[sigla] = 1);
        if (sigla != 'admin') this.metaAuthRequests.admin++ || (this.metaAuthRequests.admin = 1);
    }

    static addTocThumbnailRemoves() {
        this.tocThumbnailRemoves++;
    }

    static addCoverRemoves() {
        this.coverRemoves++;
    }

    static addMetaRemoves() {
        this.metaRemoves++;
    }

    static addMetaAuthRemoves() {
        this.metaAuthRemoves++;
    }

    static addMetaFetches(sigla: any) {
        this.metaFetches[sigla]++ || (this.metaFetches[sigla] = 1);
        if (sigla != 'admin') this.metaFetches.admin++ || (this.metaFetches.admin = 1);
    }

    static addMetaAuthFetches(sigla: any) {
        this.metaAuthFetches[sigla]++ || (this.metaAuthFetches[sigla] = 1);
        if (sigla != 'admin') this.metaAuthFetches.admin++ || (this.metaAuthFetches.admin = 1);
    }

    static addTimeoutCount(sigla: any) {
        this.timeoutCount[sigla]++ || (this.timeoutCount[sigla] = 1);
        if (sigla != 'admin') this.timeoutCount.admin++ || (this.timeoutCount.admin = 1);
    }

    static addCoverNotfound(sigla: any) {
        this.coverNotfound[sigla]++ || (this.coverNotfound[sigla] = 1);
        if (sigla != 'admin') this.coverNotfound.admin++ || (this.coverNotfound.admin = 1);
    }

    static addTocThumbnailNotfound(sigla: any) {
        this.tocThumbnailNotfound[sigla]++ || (this.tocThumbnailNotfound[sigla] = 1);
        if (sigla != 'admin') this.tocThumbnailNotfound.admin++ || (this.tocThumbnailNotfound.admin = 1);
    }

    static addTocPdfNotfound(sigla: any) {
        this.tocPdfNotfound[sigla]++ || (this.tocPdfNotfound[sigla] = 1);
        if (sigla != 'admin') this.tocPdfNotfound.admin++ || (this.tocPdfNotfound.admin = 1);
    }

    static addCoverFetches(sigla: any) {
        this.coverFetches[sigla]++ || (this.coverFetches[sigla] = 1);
        if (sigla != 'admin') this.coverFetches.admin++ || (this.coverFetches.admin = 1);
    }

    static addTocThumbnailFetches(sigla: any) {
        this.tocThumbnailFetches[sigla]++ || (this.tocThumbnailFetches[sigla] = 1);
        if (sigla != 'admin') this.tocThumbnailFetches.admin++ || (this.tocThumbnailFetches.admin = 1);
    }

    //specialne
    static addEtagStatisticByEtagPrefix(etagPrefix: string, sigla: any) {
        if (etagPrefix === 'file') {
            this.addEtagFileMatch(sigla);
        } else if (etagPrefix === 'tocp') {
            this.addEtagTocPdfMatch(sigla);
        } else if (etagPrefix === 'toct') {
            this.addEtagTocThumbMatch(sigla);
        } else {
            this.addEtagCoverMatch(sigla);
        }
    }

    static getStatisticsBySigla(s: any, sigla: number) {

        var stats = <Stats>{};

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

        s.db.collection(metaCollection).count(function(err, metaCount) {
            s.db.collection('cover').count(function(err, coverCount) {
                s.db.collection('logs').count(function(err, logsCount) {
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
    }

    static clearData() {
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
    }

    private static uptime() {
        var now: any = new Date();
        var uptime: any = Math.floor((now.getTime() - this.dateStartup.getTime()) / 1000);

        var sec: any = uptime % 60;
        uptime -= sec;
        uptime /= 60;
        var min: any = uptime % 60;
        uptime -= min;
        uptime /= 60;
        var hour: any = uptime % 24;
        uptime -= hour;
        uptime /= 24;

        now.setHours(hour, min, sec);
        var time: any = now.toString().split(' ')[4];

        // 00:02:51 up 0 days, 2013-12-06T08:35:21.962Z
        return time + ' up ' + uptime + ' days, ' + this.dateStartup.toISOString()
    }
}
