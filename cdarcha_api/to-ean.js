/**
 *
 * Convert and ISBN13, ISBN10, EAN13, ISSN all to EAN13
 *
 * @param    string code ISBN, ISSN, or EAN code
 * @return   string Normalized EAN13 code (strict 13digit, without hyphens)
 *                  Returns "undefined" when failed
 *
 */
exports.toEan = function (code) {
  // cleans up possibly messy input
  code = codeNormalize(code);

  // ISSN
  if (code.length == 8) {
    if (!isValidCheckSumMod11(code)) return null;
    code = '977'+code.substring(0, 7)+'00';
    return code+getCheckSumMod10(code);
	}
  // ISBN10
  else if (code.length == 10) {
      if (!isValidCheckSumMod11(code)) return null;
			return ISBN10toEAN(code);
  }
  // EAN + ISBN13 without check digit
  else if (code.length == 11) {
    return '00'+code;
  }
  else if (code.length == 12) {
    return '0'+code;
  }
  // ISSN
  else if (code.length == 13) {
    if (code.substring(0, 3) == '977') {
      var ean = code.substring(0, 10)+'00';
      return ean+getCheckSumMod10(ean);
    }
  }
  // EAN + ISBN13
  return code;
};

/**
 *
 * Removes useless chars from EAN, ISBN, or ISSN code.
 * Numeric string which migth include ending X as ISBN10+ISSN checksum.
 *
 * @param    string code ISBN, ISSN, or EAN code
 * @return   string Normalized string (without hyphens + might contain ending X)
 *
 */
function codeNormalize (code) {
  return code.toString().toUpperCase().replace(/[^0-9X]/g, '');
}

/**
 *
 * Calculates modulo 10 checksum (for EAN13/ISBN13).
 * Removes checksum if whole EAN13/ISBN13 provided and calculates new.
 *
 * @param    string code ISBN13, or EAN13
 * @return   string Checksum
 *
 */
function getCheckSumMod10 (codeCommon) {
  var sum = 0;
  code = codeCommon.length==13 ? codeCommon.slice(0, -1) : codeCommon;

  // from left most significat digit to right less significant digit
  for (var i=0; i<=codeCommon.length-1; i++) {
    // multiply by 1 every odd digit
    sum += parseInt(code.charAt(i));
    // multiply by 3 every even digit
    sum += parseInt(code.charAt(++i))*3;
  }
  var mod = 10 - (sum % 10);
  return (mod == 10) ? 0 : mod;
}

/**
 *
 * Calculates modulo 11 checksum. Usable for ISBN10 and ISSN.
 * Mod 11 of entire code including checksum must be 0.
 *
 * @param    string code ISBN10, or ISSN
 * @return   bool Checksum failure/success
 *
 */
function isValidCheckSumMod11 (isbn) {
  var sum = pos = 0;
  var len = isbn.length;
  if (len!=10 && len!=8) return false; // only for ISBN10 or ISSN

  // sum all chars left to right. Multiply most significant digit by 10,
  // and decrementing multiplier down to 1 for less sig. digit.
  for (var i=len; i>=1; i--) {
    var dig = isbn.charAt(pos);
    sum += i * (dig=='X' ? 10 : parseInt(dig)); // X stands for 10
    pos++;
  }
  // checksum (modulo 11) of valid ISBN10 must be 0
  return (sum%11)==0 ? true : false;
}

/**
 *
 * Transfers ISBN10 to EAN13.
 *
 * @param    string isbn ISBN10
 * @return   string EAN13 including checksum
 *
 */
function ISBN10toEAN (isbn) {
  isbn = isbn.length==10 ? isbn.substring(0, 9) : isbn;
  var code = '978'+isbn;
  return code+getCheckSumMod10(code);
}
