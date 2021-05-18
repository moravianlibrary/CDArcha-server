"use strict";
// ====================== PERMISSIONS.TS ===================
exports.__esModule = true;
exports.Permissions = void 0;
var Permissions = /** @class */ (function () {
    function Permissions() {
    }
    Permissions.addPerm = function (s) {
        s.response.writeHead(200);
        var newPerm = {};
        if (s.remoteIP === ipBackend || s.remoteIP === '127.0.0.1' || s.remoteIP === '::1' || s.remoteIP === '::ffff:127.0.0.1') {
            //testLog
            if (s.query.ref)
                newPerm = { ref: s.query.ref, sigla: s.query.sigla };
            else if (s.query.ip)
                newPerm = { ip: s.query.ip, sigla: s.query.sigla };
            // add permission if not exists
            s.db.collection('perms').find(newPerm).count(function (err, permCount) {
                if (permCount == 0)
                    s.db.collection('perms').insert(newPerm, { w: 0 }, function (err, result) {
                        Permissions.getPerms(s.db);
                    });
            });
            s.response.write(JSON.stringify(Permissions.perms, null, ' ') + '\n\n');
            s.response.write(JSON.stringify(Permissions.referers, null, ' ') + '\n\n');
        }
        s.response.end('ok');
    };
    Permissions.getPerms = function (db, clear) {
        if (clear === void 0) { clear = false; }
        if (clear === true) {
            Permissions.perms = {};
            Permissions.referers = {};
        }
        Permissions.perms['127.0.0.1'] = 'admin';
        Permissions.perms['::1'] = 'admin';
        Permissions.perms['::ffff:127.0.0.1'] = 'admin';
        db.collection('perms').find().toArray(function (err, items) {
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item.ref) {
                    console.log('referer: ' + item.ref);
                    Permissions.referers[item.ref.toLowerCase()] = item.sigla.trim();
                }
                if (item.ip) {
                    console.log('ip: ' + item.ip);
                    Permissions.setSiglaForIp('::ffff:' + item.ip.trim(), item.sigla.trim());
                }
            }
        });
    };
    Permissions.reloadPerms = function (s) {
        Permissions.getPerms(s.db);
        s.response.writeHead(200);
        if (Permissions.perms[s.remoteIP] || s.remoteIP === '127.0.0.1' || s.remoteIP === '::1' || s.remoteIP === '::ffff:127.0.0.1') {
            if (s.query.vymaz === 'true') {
                // for tests and debug only, not public url parameter
                Permissions.perms = {};
                Permissions.referers = {};
                etags = {};
                Statistics.clearData();
                // getPerms(db);
            }
            s.response.write(JSON.stringify(Permissions.perms, null, ' ') + '\n\n');
            s.response.write(JSON.stringify(Permissions.referers, null, ' ') + '\n\n');
        }
        s.response.end('ok');
    };
    Permissions.getSiglaForIp = function (ip) {
        return Permissions.perms[ip];
    };
    Permissions.setSiglaForIp = function (ip, sigla) {
        Permissions.perms[ip] = sigla;
    };
    Permissions.refererValid = function (referer, ip, encsigla) {
        // console.log('revererValid:' + referer);
        if (encsigla) {
            console.log(encsigla);
            var sigla = Helpers.decrypt(encsigla);
            if (regexpSigla.test(sigla))
                return sigla;
        }
        var sigla = Permissions.getSiglaForIp(ip);
        if (sigla)
            return sigla;
        if (!referer)
            return false;
        referer = referer.toLowerCase();
        var refererOrig = referer;
        referer = referer.split('?')[0];
        var index = referer.indexOf('/', 8);
        if (index > 0)
            referer = referer.slice(0, index);
        if (Permissions.referers[referer]) { // 1. segment URL
            return Permissions.referers[referer];
        }
        if (Permissions.referers[referer + '/']) {
            return Permissions.referers[referer + '/'];
        }
        var index2nd = refererOrig.indexOf('/', index + 1);
        if (index2nd > 0)
            referer = refererOrig.slice(0, index2nd);
        if (Permissions.referers[referer]) { // 1.+2. segment URL
            return Permissions.referers[referer];
        }
        if (Permissions.referers[referer + '/']) {
            return Permissions.referers[referer + '/'];
        }
        if (Permissions.referers[refererOrig]) { // presna shoda URL
            return Permissions.referers[refererOrig];
        }
        //shoda adresy reverzne (porovnani vsech registrovanych adres s aktualnim referer)
        for (var property in Permissions.referers) {
            if (Permissions.referers.hasOwnProperty(property)) {
                if (refererOrig.indexOf(property) !== -1) {
                    return Permissions.referers[property];
                }
            }
        }
        console.log('referer ' + referer + ' is not valid (' + refererOrig + ')');
        return false;
    };
    Permissions.ipValid = function (xreferer, ip, sigla) {
        //console.log('ipValid:' + ip);
        var tmp = Permissions.refererValid(xreferer, ip, null);
        if (!tmp)
            return false;
        if (tmp === 'sigla') {
            return sigla;
        }
        else {
            return tmp;
        }
    };
    Permissions.referers = {}; // povolene referer hlavicky
    Permissions.perms = {}; // povolene ip adresy
    return Permissions;
}());
exports.Permissions = Permissions;
