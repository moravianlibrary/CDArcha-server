/**
 * Modul: book-part-parser
 * Popis: Slouzi pro oddelini informaci o casti monografie, nebo periodika z neformatovaneho textu.
 *        Rozeznava informace rok / rocnik / cislo / poznamka
 *
 * Posledni zmena: 2015-02-19
 */

// inicializace regularnich vyrazu
var regexpMissing = new RegExp(/(chybí|Chybí|CHYBÍ|ch\.|Ch\.|CH\.)/g);
var regexpDigAny = new RegExp(/\d/);
var regexpD1 = new RegExp(/^\d$/);
var regexpD4 = new RegExp(/^\d{4}$/);
var regexpD3 = new RegExp(/^\d{1,3}$/);
var regexpD3Any = new RegExp(/\d{1,3}/);
var regexpYearDelim = new RegExp(/^[\,\-]$/);
var regexpYearD1 = new RegExp(/^[\d\-\,]$/);
var regexpSpace = new RegExp(/^\s$/);
var regexpRepeatingUnderscore = new RegExp(/([_]){2,}/g);
var regexpNonAlfaNum = new RegExp(/[^a-zA-Z\d\-\,]/g);
var regexpAlfa = new RegExp(/^[a-zA-ZěščřžýáíéúůňťľĺôäĚŠČŘŽÝÁÍÉÚŮŇŤĽĹÔÄ]$/);
var regexpAlfaNum = new RegExp(/^[\wěščřžýáíéúůňťľĺôäĚŠČŘŽÝÁÍÉÚŮŇŤĽĹÔÄ\.\,;]$/);
var regexpIsPart = new RegExp(/^(r(\.|$)|roč(\.|$)|ročník|č(\.|$)|číslo|Č(\.|$)|Číslo|rok|sv(\.|$)|svazek|díl|(\s|^)no(\.|$|\s)|(\s|^)nr(\.|$|\s)|(\s|^)No(\.|$|\s)|(\s|^)Nr(\.|$|\s)|folge|Folge|heft|Heft|number|Number|Měs\.|měs\.|\+)$/); // vseobecne identifikatory
var regexpTrimPart = new RegExp(/^[\s\[\]\(\)\.\,\-\;\\\/_]$/);
var regexpClasifyPart1 = new RegExp(/(r\.)(.*)(\d{4})/);
var regexpClasifyPart2 = new RegExp(/(č(\.|$)|c(\.|$)|číslo|Č(\.|$)|Číslo|sv(\.|$)|svazek|díl|(\s|^)no(\.|$|\s)|(\s|^)nr(\.|$|\s)|měs\.|Měs\.|issue|num(\.|$)|numb(\.|$)|částka|folge|heft|number)/);
var regexpClasifyVolume = new RegExp(/(r\.|roč\.|vol\.|ročník|volume|R\.|Roč\.|Vol\.|Ročník|Volume|jahrg\.|Jahrg\.)/);
var regexpClasifyMonth = new RegExp(/(leden|únor|Únor|březen|bŘezen|duben|květen|kvĚten|červenec|Červenec|červene$|Červene$|červen|Červen|srpen|září|zÁŘÍ|říjen|ŘÍJEN|listopad|prosinec)/);;
var regexpNormalizeInterpunction = new RegExp(/[ěščřžýáíéúůňľĺôäĚŠČŘŽÝÁÍÉÚŮŇĽĹÔÄ]/g);
var replaceLookupInterpunction = {'ě':'e','š':'s','č':'c','ř':'r','ž':'z','ý':'y','á':'a','í':'i','é':'e','ú':'u','ů':'u','ň':'n','ľ':'l','ĺ':'l','ô':'o','ä':'a','Ě':'e','Š':'s','Č':'c','Ř':'r','Ž':'z','Ý':'y','Á':'a','Í':'i','É':'e','Ú':'u','Ů':'u','Ň':'n','Ľ':'l','Ĺ':'l','Ô':'o','Ä':'a'};
var regexpNormalizeMonth = new RegExp(/(leden|unor|brezen|duben|kveten|cervenec|cervene$|cerven|srpen|zari|rijen|listopad|prosinec)/g);
var replaceLookupMonth = {'leden':'1','unor':'2','brezen':'3','duben':'4','kveten':'5','cervene':'7','cervenec':'7','cerven':'6','srpen':'8','zari':'9','rijen':'10','listopad':'11','prosinec':'12'};
var regexpNormalizeSpace = new RegExp(/\s/g);
var regexpNormalizeVolume = new RegExp(/\d{1,3}([\s\-\,\.\[\]\(\)\/a]*\d{1,3}[\]\)]*)*/);
var regexpNormalizeYear = new RegExp(/\d{3,4}([\s\-\,\.\[\]\(\)\/a]*\d{2,4}[\]\)]*)*/);
var regexpTestBrackets = new RegExp(/^\s*[\[\(](.*)[\]\)]\s*$/);
var regexpRemoveBrackets = new RegExp(/[\(\[](.*)[\)\]]/g);
var regexpNormalizeDash = new RegExp(/[\s]*\-[\s]*/g);
var regexpNormalizeComma = new RegExp(/[\s]*\,[\s]*/g);

/**
 * Parsuje neformatovany text a snazi se ziskat informaci o roku / rocniku / cislu
 *
 * @param    string Neformatovany text urceny ke zpracovani
 * @return   object part_year: rok vydani; pouziva se pro periodika
 *                  part_volume: rocnik vydani; pouziva se pro periodika
 *                  part_no: cislo casti periodika, nebo oznaceni casti monografie
 *                  part_note: extra information such as "+ CD"
 */
exports.parse = function (item) {

  // informaci o chybejicich cislech nepotrebujeme
  item.replace(regexpMissing, function(foundStr, p1, p2, offset, s) {
    item = item.substring(0, p2);
  });
  // normalizace pomlcky
  item = item.replace(regexpNormalizeDash, '-');
  
  /***
   * HLEDANI HRANY INFORMACE ROK/ROCNIK/CISLO 
   ***/
  var lastDecisiveChar = '';  // posledni znak, ktery ma vahu; alfanumericke znaky
  var lastEdge = 0;           // pozice posledni nalezene hrany informace
  var lastType = null;       // typ informace v poslednim nalezenem segmentu
  var flagYear = false;      // priznak nalezeneho roku; false=hledat rok; true=rok nalezen a nepokracovat v hledani (dalsi vyskut roku bude chapan jako oznaceni cisla/dilu)
  var flagSpace = false;     // priznak vyskytu mezery
  var part = {year:null, volume:null, part:null, note:null}; // nalezene casti informace
  var orphant = new Array(); // pole nerozeznanych informaci
  for (i=0; i<item.length; i++) {
    var chr = item[i];
    var chrPrev = item[i-1];
    
    // posledni 4 znaky; slouzi pro hledani hrany informace (rok)
    var stack4 = item.substring(i-3,i+1);
    
    // hrana informace je rok = 4 mistne cislo
    // zohlednuje i rozsahy roku napr. 2010-12,14-15
    // priklad: R.2014-15 Roc.51 C.15
    if (regexpD4.test(stack4) && flagYear!==true) {
      flagYear = true;
      var tmp = trimPart(item.substring(lastEdge, i-3));
      if (isPart(tmp)) savePart(tmp, lastType, part, orphant);
      lastEdge = i-3;
      lastType = 'year';
      // rok muze pokracovat tj. jedna se o rozmezi, nebo vycet let
      if (regexpYearDelim.test(item.substring(i+1,i+2))) {
        // hledani konce rozmezi let
        for (i=i+1; i<item.length; i++) {
          chr = item[i];
          if (regexpYearD1.test(chr)) continue;
          var tmp = item.substring(lastEdge, i);
          if (isPart(tmp)) savePart(tmp, lastType, part, orphant);
          lastEdge = i;
          lastType = null;
          break;
        }
      }
    }
    // hrana je prechod z cisla na pismeno
    // priklad: R.2014 Roč.51 Č.15
    else if (regexpD1.test(lastDecisiveChar) && regexpAlfa.test(chr)) {
      var tmp = trimPart(item.substring(lastEdge, i));
      if (isPart(tmp)) savePart(tmp, lastType, part, orphant);
      lastEdge = i;
      lastType = null;
    }
    // hrana je prechod z cisla na jine cislo, pokud predchazela mezera
    // priklad: 2014 51 2
    else if (regexpD1.test(lastDecisiveChar) && regexpD1.test(chr) && flagSpace) {
      var tmp = trimPart(item.substring(lastEdge, i-1));
      if (isPart(tmp)) savePart(tmp, lastType, part, orphant);
      lastEdge = i-1;
      lastType = null;
    }
    // znak plus je poznamka
    // priklad: 1993, roč. 30, č. 15-26 + magazín
    else if (chr=='+') {
      var tmp = trimPart(item.substring(lastEdge, i-1));
      if (isPart(tmp)) savePart(tmp, lastType, part, orphant);
      lastEdge = i;
      lastType = 'note';
      i = item.length; // za poznamkou uz v hledani info. nepokracujeme
    }
    // hrana informace je carka nebo strednik
    else if (chr==' ' && (chrPrev==',' || chrPrev==';')) {
      var tmp = trimPart(item.substring(lastEdge, i-1));
      if (isPart(tmp)) savePart(tmp, lastType, part, orphant);
      lastEdge = i-1;
      lastType = null;
    }
    
    // priznak nalezene mezery
    // podle mezer se hleda hrana informace: cislo mezera cislo
    if (regexpD1.test(chr)) flagSpace = false;
    else if (regexpSpace.test(chr)) flagSpace = true;
    
    // znaky, podle kterych se hleda hrana informace
    lastDecisiveChar = regexpAlfaNum.test(chr) ? chr : lastDecisiveChar;
  }
  
  // posledni segment retezce
  var tmp = trimPart(item.substring(lastEdge));
  if (isPart(tmp)) savePart(tmp, lastType, part, orphant);
  
  /***
   * KLASIFIKACE DOPOSUD NEZARAZENYCH INFORMACI
   * Postupujeme od konce pole "orpant" k zacatku. Posledni element byva part a
   * pokud se najde samostatne jedno cislo jedna se rocnik (pro rozsah rocniku toto rozeznani nefunguje).
   ***/
  for (i=orphant.length-1; i>=0; i--) {
    tmp = orphant[i];
    // cislo/svazek
    if (!part.part && i==orphant.length-1) { part.part=tmp; continue; }
    // rocnik
    if (!part.volume && regexpD3.test(tmp) && tmp.indexOf('-')==-1) { part.volume=tmp; continue; }
  }
  
  return part;
};

/**
 *
 * Identifies whether string is "part" or not
 *
 * @param    string str Unformated string to be identified
 * @return   bool
 *
 */
function isPart(str) {
  str = str.toLowerCase();
  if (regexpIsPart.test(str) || str=='') return false;
  return true;
}

/**
 *
 * Removes unwanted information from string
 *
 * @param    string str Unformated string to be cleaned
 * @return   string Cleaned string
 *
 */
function trimPart(str) {
  str = str.trim();
  if (str=='' || regexpTrimPart.test(str)) return '';
  var startAt=0, endAt=str.length;
  
  // najdi od zacatku, kde zacina rozumna informace
  for (p=0;p<str.length-1;p++) {
    if (!regexpTrimPart.test(str[p])) break;
    startAt=p+1;
  }
  
  // najdi od konce, kde zacina rozumna informace
  for (p=str.length-1;p>=0;p--) {
    if (!regexpTrimPart.test(str[p])) break;
    endAt=p;
  }
  
  // provede ocisteni = orezani retezce podle drive vymezenych mezi od-do
  if (startAt>0 || endAt<str.length) str=str.substring(startAt, endAt);
  
  // zamena teckovych zbytecnosti napr. 1.,2 = 1,2 nebo 2.-4 = 2-4
  str = str.replace(' a ', ','); 
  str = str.replace('.,', ','); str = str.replace('.-', '-');
  str = str.replace(']-', '-'); str = str.replace('-[', '-');
  str = str.replace(')-', '-'); str = str.replace('-(', '-');
  str = str.replace('/-', '-'); str = str.replace('-/', '-');
  str = str.replace(',_', '_'); str = str.replace('._', '_');
  str = str.replace('_-', '-'); str = str.replace('-_', '-');
  // v pripade, ze zustane "c_" na zacatku, potreba odstrihnout
  // stava se napr. u "c. leden-prosinec" = "c_1-12" = "1-12"
  if (str.substring(0,2)=='c_') str=str.substring(2,str.length);
  
  return str;
 }

/**
 *
 * Removes unwanted information from string
 *
 * @param    string str Unformated string to be cleaned
 * @return   string Cleaned string
 *
 */
 function normalizePureText(str) {
  str.replace(regexpNormalizeInterpunction, function(foundStr, p1, p2, offset, s) {
    str = str.replace(foundStr, replaceLookupInterpunction[foundStr]);
  });
  str.replace(regexpNormalizeMonth, function(foundStr, p1, p2, offset, s) {
    str = str.replace(foundStr, replaceLookupMonth[foundStr]);
  });
  str = str.replace('spec.','special');
  str = str.replace(regexpNormalizeSpace,'_');
  str = str.replace(regexpNonAlfaNum,'_');
  str = str.replace(regexpRepeatingUnderscore,'_');
  if (str[0]=='_') str = str.substring(1);
  if (str[str.length-1]=='_') str = str.substring(0,str.length-1);
  
  // rocni obdobi
  if (str.indexOf('zima-jaro')!=-1) str = str.replace('zima-jaro','1-6');
  if (str.indexOf('jaro-leto')!=-1) str = str.replace('jaro-leto','4-9');
  if (str.indexOf('leto-podzim')!=-1) str = str.replace('leto-podzim','7-12');
  if (str.indexOf('podzim-zima')!=-1) str = str.replace('podzim-zima','10-15');
  if (str.indexOf('jaro-zima')!=-1) str = str.replace('jaro-zima','1-12');
  if (str.indexOf('jaro')!=-1) str = str.replace('jaro','4-6');
  if (str.indexOf('leto')!=-1) str = str.replace('leto','7-9');
  if (str.indexOf('podzim')!=-1) str = str.replace('podzim','10-12');
  if (str.indexOf('zima')!=-1) str = str.replace('zima','1-3');

  return str;
}

/**
 *
 * Identifikuj cast informace, jestli se jedna o identifikaci rocnika, cisla, nebo nevime.
 * Rok je identifikavan vyskytem ctyrcisli a tato funkce to neresi.
 *
 * @param    string str Unformated string to be identified
 * @return   string volume|part|null
 *
 */
function clasifyPart(str) {
  str = str.toLowerCase();
  if (regexpClasifyPart1.test(str)) return 'part';
  if (regexpClasifyVolume.test(str)) return 'volume';
  if (regexpClasifyPart2.test(str)) return 'part';
  if (regexpClasifyMonth.test(str)) return 'part';
  return null;
}

/**
 *
 * Uloz informaci do objektu pokud zname kde ulozit, nebo pridej do pole nerozeznanych informaci pokud nezname.
 *
 * @param    string val Informace, kterou chceme ulozit
 * @param    string lastType Drive rozeznany typ informace (pokud se jedna o rok/rocnik/cislo)
 * @param    object part Objekt s rozeznanymi informacemi
 * @param    array  orphant Pole nerozeznanych informaci
 *
 */
function savePart(val, lastType, part, orphant) {
  // pokud drive nebyla informace rozeznana, pokusime se ted
  if (lastType==null) lastType = clasifyPart(val);
  //console.log(val);
  //console.log(lastType);
  switch (lastType) {
    case 'year': part.year=val; break;
    case 'volume': part.volume=val; break;
    case 'note': part.note=val; break;
    case 'part': 
      var tmp = part.part;
      if (tmp!=null) {
        tmp = tmp.toLowerCase();
        if (regexpIsPart.test(val)) break; // pokud uz mame takto presne definovane cislo tak nech byt
      }
      if (part.part!=null) val = part.part+'|'+val;
      part.part=val; break;
    default: orphant.push(val);
  }
//    console.log(JSON.stringify(part));
//    console.log(JSON.stringify(orphant));
//    console.log('---');
}

/**
 *
 * Normalizace cisla.
 *
 * @param    string item Textova reprezentace roku, kterou chceme normalizovat
 * @param    string Normalizovany text
 *
 */
exports.normalizePart = function (str) {
  str = str.toLowerCase();
  str = str.replace('spec.','special');
  str = str.replace(regexpNormalizeDash, '-');
  str = str.replace(regexpNormalizeComma, ',');
  
  // odstranime posledny vyskyt znaku + a vsetko co je za
  // napr. "13 + pexeso" zmeni na "13"
  var lastPlus = str.indexOf("+");
  if (lastPlus > -1) str = str.substr(0,lastPlus-1);
  
  // informaci o chybejicich cislech nepotrebujeme
  str.replace(regexpMissing, function(foundStr, p1, p2, offset, s) {
    str = str.substring(0, p2);
  });
  
  // sestav radu cisel z posloupnosti definovane v PART_NO/PART_NAME
	if (!str.match(regexpAlfa) && (str.indexOf(',')!=-1 || str.indexOf('-')!=-1)) {
		var book_part_no = new Array();
		var part_no_separated = str.split(',');
		// carka oddeluje hodnoty/rozsahy hodnot
		for (key in part_no_separated) {
			var part_no = part_no_separated[key].split('-');
			// neni rozsahem, obsahuje jednu hodnotu
			if (part_no.length == 1) {
				book_part_no.push(part_no[0].trim());
				continue;
			}
			// muze byt rozsahem
			if (part_no.length < 2) continue;
			if (!part_no[0].match(regexpDigAny)) continue;
			if (!part_no[1].match(regexpDigAny)) continue;
			var cycleFrom = parseInt(part_no[0]);
			var cycleTo = parseInt(part_no[1]);
			if (cycleFrom > cycleTo) continue; // rozsah musi byt dopredny
			for (var i=cycleFrom; i<=cycleTo; i++) {
				book_part_no.push(i);
			}
		}
		if (book_part_no.length > 0) str = book_part_no.join(',');
	}
  
  // hledame vice urovnove oznaceni casti monografie (napr. "Ottuv slovnik naucny, 1.díl, 2.sv." se normalizuje na 1|2)
  // na vystupu bude vzdy v poradi dil|svazek i kdyz se informace na vstupu prohodi
  // 1) znak "|" pridava parser pri pricesu parsovani - to bude pouzivat hlavne Aleph
  // 2) pokud se v oznaceni casti najde "sv" a zaroven "díl"
  if (str.indexOf('|') != -1 || (str.indexOf('sv') != -1 && str.indexOf('díl') != -1)) {
    var specialParts = new Array();
    // prvni v poradi je dil
    var tmp = str.match(/([0-9\s\.\-\,]*(díl|díly)[0-9\s]*)/);
    if (tmp) {
      if (tmp[0]!='díl' && tmp[0]!='díly')
          specialParts.push(tmp[0]);
    }
    
    // svazek je druhy v poradi
    var tmp = str.match(/([0-9\s\.\-\,]*(sv(\.{0,1})|svazek|svazky)[0-9\s]*)/);
    if (tmp) {
      if (tmp[0]!='sv' && tmp[0]!='sv.' && tmp[0]!='svazek' && tmp[0]!='svazky')
          specialParts.push(tmp[0]);
    }
    
    // ulozeni do spravneho poradi dil-svazek
    // pole uz mame takto serazene, staci spojit
    if (specialParts.length == 2) {
      var strArr = specialParts.join('|').match(/[\d\,\-|]*/g);
      return strArr.join('');
    }
  }
  
  // ocistit cislo casti od zbytecnosti
  if (regexpD3Any.test(str)) {
    str = str.replace(regexpClasifyPart2, '');
    str = str.replace(regexpClasifyVolume, '');
  }
  
  // pokud obsahuje pouze text, normalizovat text, pokud obsahuje cislo, vyber cislo
  var tmp = null;
  if (str.match(regexpAlfa)) tmp = str.match(regexpNormalizeVolume);
  str = tmp!=null ? tmp[0] : normalizePureText(str);
  
  return trimPart(str);
}

/**
 *
 * Normalizace roku.
 * Jako spravny format se bere napr. "2014", "2014-15", "2014-15,16" apod.
 *
 * @param    string item Textova reprezentace roku, kterou chceme normalizovat
 * @param    string Normalizovany text
 *
 */
exports.normalizeYear = function (item) {
  item = item.replace(';',',');
  item = item.replace(regexpNormalizeDash, '-');
  item = item.replace(regexpNormalizeComma, ',');
  item = !regexpTestBrackets.test(item) ? item.replace(regexpRemoveBrackets, '') : item;
  
  // sestav radu cisel z posloupnosti definovane v PART_YEAR
	if (!item.match(regexpAlfa) && (item.indexOf(',')!=-1 || item.indexOf('-')!=-1)) {
		var book_part_year = new Array();
		var last_valid_year;
		var part_year_separated = item.split(',');
		// carka oddeluje hodnoty/rozsahy hodnot
		for (key in part_year_separated) {
			var part_year = part_year_separated[key].split('-');
			// doplneni plne formy zapisu let
			for (var i=0; i<=1; i++) {
				if (!part_year[i]) continue;
				var rVal = part_year[i].trim();
				var rValLength = rVal.length;
				if (rValLength>2) last_valid_year = rVal; // nova hodnota jako vzor pro doplnovani nekompletnich let
				if (rValLength>2) continue; // hodnota ma uz dobrou formu (3-4 mistne cislo)
				if (!last_valid_year) continue; // pro doplneni zkracene formy roku potrebujeme kompletni zapis
				var pValPost = parseInt(last_valid_year.substring(last_valid_year.length-rValLength, last_valid_year.length)); // cast kompletniho zapisu roku shodne delky jako je nekompletni rok
				var pValPre = parseInt(last_valid_year.substring(0, rValLength)); // cast kompletniho zapisu roku shodne delky jako je nekompletni rok
				if (pValPost < rVal) {
					// budeme doplnovat stejne desetileti/stoleti jako kompletni rok
					// priklad 1950-56 = 1950-1956
					part_year[i] = pValPre + rVal;
				} else {
					// bude potrebny presun do dalsiho desetileti/stoleti
					// priklad 1998-02 = 1998-2002
					part_year[i] = (parseInt(pValPre)+1) + rVal;
				}
			}
			// neni rozsahem, obsahuje jednu hodnotu
			if (part_year.length == 1) {
				book_part_year.push(part_year[0].trim());
				continue;
			}
			// muze byt rozsahem
			if (part_year.length < 2) continue;
			if (!part_year[0].match(regexpDigAny)) continue;
			if (!part_year[1].match(regexpDigAny)) continue;
			var cycleFrom = parseInt(part_year[0]);
			var cycleTo = parseInt(part_year[1]);
			if (cycleFrom > cycleTo) continue; // rozsah musi byt dopredny
			for (var i=cycleFrom; i<=cycleTo; i++) {
				book_part_year.push(i);
			}
		}
		if (book_part_year.length > 0) item = book_part_year.join(',');
	}
  
  // pokud obsahuje pouze text, normalizovat text, pokud obsahuje cislo, vyber cislo
  var tmp = item.match(regexpNormalizeYear);
  item = tmp!=null ? tmp[0] : normalizePureText(item);
  item = item.replace(regexpNormalizeSpace,'');
  
  return trimPart(item);
}

/**
 *
 * Normalizace rocniku.
 *
 * @param    string item Textova reprezentace rocniku, kterou chceme normalizovat
 * @param    string Normalizovany text
 *
 */
exports.normalizeVolume = function(item) {
  item = item.replace(regexpNormalizeDash, '-');
  item = item.replace(regexpNormalizeComma, ',');
  
  // sestav radu cisel z posloupnosti definovane v PART_VOLUME
	if (!item.match(regexpAlfa) && (item.indexOf(',')!=-1 || item.indexOf('-')!=-1)) {
		var book_part_volume = new Array();
		var part_volume_separated = item.split(',');
		// carka oddeluje hodnoty/rozsahy hodnot
		for (key in part_volume_separated) {
			var part_volume = part_volume_separated[key].split('-');
			// neni rozsahem, obsahuje jednu hodnotu
			if (part_volume.length == 1) {
				book_part_volume.push(part_volume[0].trim());
				continue;
			}
			// muze byt rozsahem
			if (part_volume.length < 2) continue;
			if (!part_volume[0].match(regexpDigAny)) continue;
			if (!part_volume[1].match(regexpDigAny)) continue;
			var cycleFrom = parseInt(part_volume[0]);
			var cycleTo = parseInt(part_volume[1]);
			if (cycleFrom > cycleTo) continue; // rozsah musi byt dopredny
			for (var i=cycleFrom; i<=cycleTo; i++) {
				book_part_volume.push(i);
			}
		}
		if (book_part_volume.length > 0) item = book_part_volume.join(',');
	}
  
  var tmp = item.match(regexpNormalizeVolume);
  str = tmp!=null ? tmp[0] : normalizePureText(item);
  str = !regexpTestBrackets.test(str) ? str.replace(regexpRemoveBrackets, '') : str;
  str = str.replace(regexpNormalizeSpace,'');
  return trimPart(str);
}
