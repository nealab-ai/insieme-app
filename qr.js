/* QR code encoder for the invite page: byte mode, error correction M, versions 1-10 (up to 213 bytes).
   Runs in the browser, so the page URL (with the invite code) is never sent to a QR service.
   Follows ISO/IEC 18004 the way Project Nayuki's QR Code generator (MIT) does; written small for this page. */
window.InsiemeQR = (function () {
  'use strict';
  // Error correction M, index = version.
  var ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
  var BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  var ECL_BITS_M = 0;

  function rawModules(ver) {
    var result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var align = Math.floor(ver / 7) + 2;
      result -= (25 * align - 10) * align - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }
  function dataCodewords(ver) {
    return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ver] * BLOCKS[ver];
  }

  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function rsDivisor(degree) {
    var result = [];
    for (var i = 0; i < degree - 1; i++) result.push(0);
    result.push(1);
    var root = 1;
    for (i = 0; i < degree; i++) {
      for (var j = 0; j < degree; j++) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return result;
  }
  function rsRemainder(data, divisor) {
    var result = divisor.map(function () { return 0; });
    data.forEach(function (b) {
      var factor = b ^ result.shift();
      result.push(0);
      divisor.forEach(function (coef, i) { result[i] ^= gfMul(coef, factor); });
    });
    return result;
  }

  function encode(text) {
    var bytes = Array.from(new TextEncoder().encode(text));
    var ver = 1;
    for (; ver <= 10; ver++) {
      var countBits = ver <= 9 ? 8 : 16;
      if (4 + countBits + bytes.length * 8 <= dataCodewords(ver) * 8) break;
    }
    if (ver > 10) throw new Error('text too long for the QR code');
    var size = ver * 4 + 17;

    // Data bits: mode, length, bytes, terminator, padding.
    var bits = [];
    var push = function (val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    push(4, 4);
    push(bytes.length, ver <= 9 ? 8 : 16);
    bytes.forEach(function (b) { push(b, 8); });
    var capacity = dataCodewords(ver) * 8;
    push(0, Math.min(4, capacity - bits.length));
    push(0, (8 - (bits.length % 8)) % 8);
    for (var pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
    var data = [];
    for (var i = 0; i < bits.length; i += 8) {
      var byte = 0;
      for (var j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
      data.push(byte);
    }

    // Error correction and interleaving.
    var numBlocks = BLOCKS[ver];
    var eccLen = ECC_PER_BLOCK[ver];
    var raw = Math.floor(rawModules(ver) / 8);
    var numShort = numBlocks - (raw % numBlocks);
    var shortLen = Math.floor(raw / numBlocks);
    var divisor = rsDivisor(eccLen);
    var blocks = [];
    for (var b = 0, k = 0; b < numBlocks; b++) {
      var dat = data.slice(k, k + shortLen - eccLen + (b < numShort ? 0 : 1));
      k += dat.length;
      var ecc = rsRemainder(dat, divisor);
      if (b < numShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var codewords = [];
    for (i = 0; i < blocks[0].length; i++) {
      for (j = 0; j < blocks.length; j++) {
        if (i !== shortLen - eccLen || j >= numShort) codewords.push(blocks[j][i]);
      }
    }

    // The grid: function patterns first.
    var modules = [];
    var isFunction = [];
    for (i = 0; i < size; i++) {
      modules.push(new Array(size).fill(false));
      isFunction.push(new Array(size).fill(false));
    }
    var setF = function (x, y, dark) { modules[y][x] = dark; isFunction[y][x] = true; };
    for (i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (c) {
      for (var dy = -4; dy <= 4; dy++) {
        for (var dx = -4; dx <= 4; dx++) {
          var xx = c[0] + dx, yy = c[1] + dy;
          var dist = Math.max(Math.abs(dx), Math.abs(dy));
          if (xx >= 0 && xx < size && yy >= 0 && yy < size) setF(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    });
    var align = [];
    if (ver > 1) {
      var n = Math.floor(ver / 7) + 2;
      var step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
      align = [6];
      for (var pos = size - 7; align.length < n; pos -= step) align.splice(1, 0, pos);
    }
    align.forEach(function (ay, ai) {
      align.forEach(function (ax, aj) {
        var last = align.length - 1;
        if ((ai === 0 && aj === 0) || (ai === 0 && aj === last) || (ai === last && aj === 0)) return;
        for (var dy = -2; dy <= 2; dy++) {
          for (var dx = -2; dx <= 2; dx++) setF(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      });
    });
    var drawFormat = function (mask) {
      var d = (ECL_BITS_M << 3) | mask;
      var rem = d;
      for (var r = 0; r < 10; r++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var f = ((d << 10) | rem) ^ 0x5412;
      var bit = function (idx) { return ((f >>> idx) & 1) !== 0; };
      for (var q = 0; q <= 5; q++) setF(8, q, bit(q));
      setF(8, 7, bit(6));
      setF(8, 8, bit(7));
      setF(7, 8, bit(8));
      for (q = 9; q < 15; q++) setF(14 - q, 8, bit(q));
      for (q = 0; q < 8; q++) setF(size - 1 - q, 8, bit(q));
      for (q = 8; q < 15; q++) setF(8, size - 15 + q, bit(q));
      setF(8, size - 8, true);
    };
    drawFormat(0);
    if (ver >= 7) {
      var rem = ver;
      for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      var vbits = (ver << 12) | rem;
      for (i = 0; i < 18; i++) {
        var on = ((vbits >>> i) & 1) !== 0;
        var a = size - 11 + (i % 3), c = Math.floor(i / 3);
        setF(a, c, on);
        setF(c, a, on);
      }
    }

    // Codewords in the zigzag.
    var bitIndex = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (j = 0; j < 2; j++) {
          var x = right - j;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (!isFunction[y][x] && bitIndex < codewords.length * 8) {
            modules[y][x] = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
            bitIndex++;
          }
        }
      }
    }

    var masks = [
      function (x, y) { return (x + y) % 2 === 0; },
      function (x, y) { return y % 2 === 0; },
      function (x) { return x % 3 === 0; },
      function (x, y) { return (x + y) % 3 === 0; },
      function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
      function (x, y) { return ((x * y) % 2) + ((x * y) % 3) === 0; },
      function (x, y) { return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; },
      function (x, y) { return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; },
    ];
    var applyMask = function (m) {
      for (var yy = 0; yy < size; yy++) {
        for (var xx = 0; xx < size; xx++) if (!isFunction[yy][xx] && masks[m](xx, yy)) modules[yy][xx] = !modules[yy][xx];
      }
    };
    // Penalty (runs, 2x2 blocks, balance): enough to avoid a mask that is hard to read; every mask is valid.
    var penalty = function () {
      var p = 0, dark = 0;
      for (var yy = 0; yy < size; yy++) {
        for (var dir = 0; dir < 2; dir++) {
          var run = 0, prev = null;
          for (var xx = 0; xx < size; xx++) {
            var v = dir === 0 ? modules[yy][xx] : modules[xx][yy];
            if (v === prev) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else { run = 1; prev = v; }
          }
        }
        for (xx = 0; xx < size; xx++) {
          if (modules[yy][xx]) dark++;
          if (yy < size - 1 && xx < size - 1) {
            var col = modules[yy][xx];
            if (col === modules[yy][xx + 1] && col === modules[yy + 1][xx] && col === modules[yy + 1][xx + 1]) p += 3;
          }
        }
      }
      var total = size * size;
      return p + (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    };
    var best = 0, bestScore = Infinity;
    for (var m = 0; m < 8; m++) {
      applyMask(m);
      drawFormat(m);
      var score = penalty();
      if (score < bestScore) { best = m; bestScore = score; }
      applyMask(m);
    }
    applyMask(best);
    drawFormat(best);
    return { size: size, version: ver, mask: best, modules: modules };
  }

  /** SVG path data, one unit per module, offset by the quiet zone. */
  function toPath(qr, border) {
    var d = [];
    for (var y = 0; y < qr.size; y++) {
      for (var x = 0; x < qr.size; x++) if (qr.modules[y][x]) d.push('M' + (x + border) + ' ' + (y + border) + 'h1v1h-1z');
    }
    return d.join('');
  }

  return { encode: encode, toPath: toPath };
})();
