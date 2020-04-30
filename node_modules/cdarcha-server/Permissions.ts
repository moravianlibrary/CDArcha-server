// ====================== PERMISSIONS.TS ===================

export class Permissions {

    static referers: any = {}; // povolene referer hlavicky
    static perms = {}; // povolene ip adresy

    static addPerm(s: Server) {
        s.response.writeHead(200);
        var newPerm: any = {};

        if (s.remoteIP === ipBackend || s.remoteIP === '127.0.0.1' || s.remoteIP === '::1' || s.remoteIP === '::ffff:127.0.0.1') {
            //testLog
            if (s.query.ref)
                newPerm = { ref: s.query.ref, sigla: s.query.sigla };
            else if (s.query.ip)
                newPerm = { ip: s.query.ip, sigla: s.query.sigla };
            // add permission if not exists
            s.db.collection('perms').find(newPerm).count(function(err, permCount) {
                if (permCount == 0) s.db.collection('perms').insert(newPerm, { w: 0 }, function(err, result) {
                    Permissions.getPerms(s.db);
                });
            });
            s.response.write(JSON.stringify(Permissions.perms, null, ' ') + '\n\n');
            s.response.write(JSON.stringify(Permissions.referers, null, ' ') + '\n\n');
        }
        s.response.end('ok');
    }

    static getPerms(db, clear = false) {
        if (clear === true) {
            Permissions.perms = {}; Permissions.referers = {};
        }
        Permissions.perms['127.0.0.1'] = 'admin';
        Permissions.perms['::1'] = 'admin';
        Permissions.perms['::ffff:127.0.0.1'] = 'admin';

        db.collection('perms').find().toArray(function(err, items) {
            for (var i: any = 0; i < items.length; i++) {
                var item: any = items[i];
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
    }

    static reloadPerms(s: Server) {
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
    }

    static getSiglaForIp(ip: any) {
        return Permissions.perms[ip];
    }

    static setSiglaForIp(ip: any, sigla: any) {
        Permissions.perms[ip] = sigla;
    }

    static refererValid(referer, ip, encsigla) {
        // console.log('revererValid:' + referer);

        if (encsigla) {
            console.log(encsigla);
            var sigla: any = Helpers.decrypt(encsigla);
            if (regexpSigla.test(sigla)) return sigla;
        }

        var sigla = Permissions.getSiglaForIp(ip);
        if (sigla) return sigla;

        if (!referer) return false;

        referer = referer.toLowerCase();
        var refererOrig: any = referer;
        referer = referer.split('?')[0];
        var index: any = referer.indexOf('/', 8);
        if (index > 0) referer = referer.slice(0, index);

        if (Permissions.referers[referer]) { // 1. segment URL
            return Permissions.referers[referer];
        }
        if (Permissions.referers[referer + '/']) {
            return Permissions.referers[referer + '/'];
        }

        var index2nd: any = refererOrig.indexOf('/', index + 1);
        if (index2nd > 0) referer = refererOrig.slice(0, index2nd);

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
    }

    static ipValid(xreferer, ip, sigla) {
        //console.log('ipValid:' + ip);
        var tmp: any = Permissions.refererValid(xreferer, ip, null);

        if (!tmp) return false;
        if (tmp === 'sigla') {
            return sigla;
        } else {
            return tmp;
        }
    }

}
