// url frontendu / spolecne url vsech frontnendu
//const urlReplace: string = "192.168.1.11:1337" //local
var urlReplace: string = "cdarcha.mzk.cz" //server

// url na backend
//const urlMain: string = "192.168.1.11" //local
var urlMain: string = "cdarcha.mzk.cz" //server

const usersCollection: string = 'users';



// ====================== HELPER.TS ===================

const bcrypt = require('bcrypt');

export class Helpers {

    static replaceUrl(meta: any, simple: any, bibinfo?: any) {

        // zjednoduseny vystup metadata API
        if (simple !== undefined) {
            var simpleItemsList = ['cover_thumbnail_url', 'cover_icon_url', 'cover_medium_url', 'cover_preview510_url', 'toc_pdf_url', 'toc_thumbnail_url', 'backlink_url', 'book_id'];
            for (var property in meta) {
                if (meta.hasOwnProperty(property)) {
                    if (simpleItemsList.indexOf(property) === -1) {
                        delete meta[property];
                    }
                }
            }
        }

        if (meta.cover_thumbnail_url) {
            meta.cover_thumbnail_url = meta.cover_thumbnail_url.replace(urlMain, urlReplace);
        }
        if (meta.cover_medium_url) {
            meta.cover_medium_url = meta.cover_medium_url.replace(urlMain, urlReplace);
        }
        if (meta.cover_preview510_url) {
            meta.cover_preview510_url = meta.cover_preview510_url.replace(urlMain, urlReplace);
        }
        if (meta.cover_icon_url) {
            meta.cover_icon_url = meta.cover_icon_url.replace(urlMain, urlReplace);
        }
        if (meta.toc_text_url) {
            delete meta.toc_text_url;
        }
        if (meta.toc_thumbnail_url) {
            meta.toc_thumbnail_url = meta.toc_thumbnail_url.replace(urlMain, urlReplace);
        }
        if (meta.toc_pdf_url && meta.toc_pdf_url.indexOf('/view') === -1) {
            meta.toc_pdf_url = meta.toc_pdf_url.replace(urlMain, urlReplace);
        }
        if (bibinfo) {
            meta.bibinfo = bibinfo;
        }
        if (meta.part_ean_standalone != null) {
            delete meta.part_ean_standalone;
            delete meta.part_nbn_standalone;
            delete meta.part_ismn_standalone;
            delete meta.part_oclc_standalone;
        }

        // cdarcha specificke
        meta.marcxmlFileUrl = 'https://' + urlReplace + '/storage/marcxml/' + meta._id + '.xml';
        meta.modsFileUrl = 'https://' + urlReplace + '/storage/mods/' + meta._id + '.xml';
        meta.metaFileUrl = 'https://' + urlReplace + '/storage/meta/' + meta._id + '.xml';

        return meta;
    }


    static getUrlByType(metadata: any, type?: any) {
        if (!metadata) return null;
        var url: any = null;

        switch (type) {
            case 'thumbnail':
                url = metadata.cover_thumbnail_url;
                break;
            case 'icon':
                url = metadata.cover_icon_url;
                break;
            case 'preview510':
                url = metadata.cover_preview510_url;
                break;
            case 'toc_thumbnail':
                url = metadata.toc_thumbnail_url;
                if (!url) return null; // toc_thumbnail nesmi v pripade neexistence vratit cover_medium_url
                break;
            default:
                url = metadata.cover_medium_url;
        }

        url = url || metadata.cover_medium_url;
        if (!url) return null;
        url = url.slice(url.indexOf('/', 8));
        console.log((type == 'toc_thumbnail' ? 'toc thumbnail' : 'cover') + ' url: ' + url);

        return url;
    }

    /**
     * Normalizace objektu bibinfo.
     * Seradi polozky v objektu bibinfo do zadaneho poradi; isbn, oclc, nbn, ismn
     * Pouziva se zejmena pro spravne parovani odpovedi BE na /api/books/?multi dotaz FE, kdy poradi polozek v dotazu a odpovedi neni stejny.
     *
     * param bibinfo Objekt bibinfo
     * prarm asObject true=vrati serazeny objekt, false=serializuje na string
     */
    static getSortedBibinfo(bibIn: any, asObject?: any) {
        var bibOut: any = {};
        var bibIn: any = bibIn || {};

        if (bibIn.isbn) bibOut.isbn = bibIn.isbn;
        if (bibIn.ismn) bibOut.ismn = bibIn.ismn;
        if (bibIn.oclc) bibOut.oclc = bibIn.oclc;
        if (bibIn.nbn) bibOut.nbn = bibIn.nbn;
        return asObject === true ? bibOut : JSON.stringify(bibOut);
    }

    /**
     * Proveruje identifikatory part_*
     */
    static partValidation(p) {
        if (!(
            (p.part_year && p.part_no) || (p.part_volume && p.part_no) ||
            (!p.part_year && !p.part_volume && (p.part_no || p.part_name)) ||
            ((p.part_year || p.part_volume) && !p.part_no) || // pro rocenky
            (!p.part_year && !p.part_volume && !p.part_no && !p.part_name)
            )) {
            console.log('part params combination not valid');
            return false;
        }
        if (p.length !== undefined) {
            console.log('object expected, array found');
            return false;
        }
        for (var prop in p) {
            if (p[prop].match(/<(.*)>/)) {
                console.log('param "' + prop + '":"' + p[prop] + '" contains illegal characters');
                return false;
            }
        }
        return true;
    }

    static bin2string(array){
        var result = "";
        for (var i = 0; i < array.length; ++i) {
            result+= (String.fromCharCode(array[i]));
        }
        return result;
    }

    static checkApiLogin(db: any, login: string, pass: string, ver: string, apiVer: string, done: (string, any) => void) {
        if (!db || !login || !pass || !ver || !apiVer) {
            done(403, null);
            return;
        }

        var verParts: any = ver.split('.') || [];
        var apiVerParts: any = apiVer.split('.') || [];
        if (!verParts[0] || !apiVerParts[0] || verParts[0] != apiVerParts[0]) {
            done(403, null);
            return;
        }

        db.collection(usersCollection).findOne({ email: login }, function(err, user) {
            if (err) {
                done(401, null);
                return;
            }
            if (!user) {
                done(401, null);
                return;
            }

            bcrypt.compare(pass, user.password, function(err, isMatch) {
                if (err) console.log(err);
                if (isMatch) {
                  done(null, user);
                } else {
                  done(401, null);
                }
            });
        });
    }

}
