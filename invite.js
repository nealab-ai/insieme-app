/* Invite page: reads the invite code from this page's address, picks Android / iPhone / computer and Italian / English.
   The code stays in this browser: this script makes no network request (the page's CSP has connect-src 'none'),
   it only builds the app link (insieme://invite/<code>), the copy button and the QR code of this page. */
(function () {
  'use strict';
  var PAGE_URL = 'https://nealab-ai.github.io/insieme-app/';
  // The app's URL scheme: app/app-identity.json "scheme" (scripts/invite-landing.test.mts keeps them equal).
  var SCHEME = 'insieme';
  // An invite code is 32 hex characters (family_invites.token, app/lib/invite-link.ts).
  var TOKEN = /^[0-9a-f]{32}$/i;

  // English copy; the Italian is the page itself. Same keys as the data-i18n attributes (checked by the tests).
  /* COPY-START */
  var EN = {
    "title": "You’ve been invited to Insieme",
    "langSwitch": "Italiano",
    "lead": "Insieme keeps family things in order: each one with a date and someone on it. You’re in after three steps.",
    "iosTitle": "Coming soon for iPhone",
    "iosBody": "For now Insieme is Android only, as a test version. The iPhone and iPad app is on its way: when it’s ready, ask whoever invited you for a new invite.",
    "iosAndroid": "Also have an Android phone? Open this link there and follow the three steps.",
    "s1Title": "Get the app",
    "s1Body": "Test version for Android, not on Google Play yet.",
    "desktopS1": "On your Android phone: test version, not on Google Play yet, about 200 MB.",
    "s1Button": "Download for Android",
    "s1Size": "APK file · about 200 MB",
    "howTitle": "How to install it",
    "how1": "Open the downloaded file (insieme.apk) from the notification or from Downloads.",
    "how2": "If Android asks, allow your browser to install unknown apps: «Settings», then «Allow from this source».",
    "how3": "Tap «Install», then come back here for step 2.",
    "s2Title": "Open the invite",
    "s2Body": "With the app installed, tap here: the invite opens in Insieme.",
    "s2Button": "Open the invite in Insieme",
    "s2Fallback": "Doesn’t open? In Insieme tap «I have an invite» and paste this code:",
    "codeLabel": "Invite code",
    "copy": "Copy the code",
    "copied": "Code copied",
    "s2NoToken": "Tap the invite link in the message you received: it opens in Insieme. Or in Insieme tap «I have an invite» and paste the code from the message.",
    "s3Title": "Sign in with your email",
    "s3Body": "We send you a 6-digit code, no password. Once you’re in, you join the family that invited you.",
    "note": "The invite is valid for 7 days and works once. If you don’t know who sent it, ignore it.",
    "qrLabel": "QR code of this page",
    "qrTitle": "Open this page on your phone",
    "qrBody": "Scan the code with your Android phone’s camera: the invite is already in it.",
    "trust": "Insieme is the app that keeps family things in order. This page uses no cookies and no analytics.",
    "privacy": "Privacy"
  };
  /* COPY-END */

  var root = document.documentElement;
  var params = new URLSearchParams(window.location.search);

  function readToken() {
    var hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    var path = window.location.pathname.split('/').filter(Boolean).pop() || '';
    var candidates = [params.get('t'), params.get('token'), hash.get('t'), path];
    for (var candidate of candidates) {
      var c = (candidate || '').trim();
      if (TOKEN.test(c)) return c.toLowerCase();
    }
    return null;
  }

  function readOs() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android|Mobi/i.test(ua)) return 'android';
    return 'desktop';
  }

  function readLang() {
    var asked = params.get('lang');
    if (asked === 'it' || asked === 'en') return asked;
    var first = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /^en\b/i.test(first) ? 'en' : 'it';
  }

  var token = readToken();
  var os = readOs();
  root.setAttribute('data-os', os);
  root.setAttribute('data-token', token ? 'yes' : 'no');

  // Italian strings, taken from the page before any switch, so switching back restores them.
  var texts = document.querySelectorAll('[data-i18n]');
  var labels = document.querySelectorAll('[data-i18n-label]');
  var IT = {};
  texts.forEach(function (el) { IT[el.getAttribute('data-i18n')] = el.textContent; });
  labels.forEach(function (el) { IT[el.getAttribute('data-i18n-label')] = el.getAttribute('aria-label'); });
  IT.title = document.title;
  var lang = 'it';
  function t(key) { return (lang === 'en' ? EN : IT)[key]; }

  function applyLang(next) {
    lang = next;
    root.setAttribute('lang', lang);
    document.title = t('title');
    texts.forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    labels.forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-label'))); });
    var langButton = document.getElementById('lang');
    langButton.setAttribute('lang', lang === 'en' ? 'it' : 'en');
    var privacy = document.getElementById('privacy');
    if (!privacy.hasAttribute('data-href-it')) privacy.setAttribute('data-href-it', privacy.getAttribute('href'));
    privacy.setAttribute('href', privacy.getAttribute('data-href-' + lang));
  }

  applyLang(readLang());
  document.getElementById('lang').addEventListener('click', function () {
    applyLang(lang === 'en' ? 'it' : 'en');
    var next = new URLSearchParams(window.location.search);
    next.set('lang', lang);
    try { window.history.replaceState(null, '', '?' + next.toString() + window.location.hash); } catch { /* file:// or a sandbox: the switch still works */ }
  });

  if (token) {
    var deepLink = SCHEME + '://invite/' + token;
    document.getElementById('open').setAttribute('href', deepLink);
    document.getElementById('code').textContent = token;
    var copyLabel = document.getElementById('copy-label');
    var timer = null;
    document.getElementById('copy').addEventListener('click', function () {
      var done = function () {
        copyLabel.textContent = t('copied');
        clearTimeout(timer);
        timer = setTimeout(function () { copyLabel.textContent = t('copy'); }, 2500);
      };
      var select = function () {
        var range = document.createRange();
        range.selectNodeContents(document.getElementById('code'));
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(token).then(done, select);
      else select();
    });
    // With the app installed, Android opens the invite straight away; without it, nothing happens and the steps stay.
    if (os === 'android') setTimeout(function () { window.location.href = deepLink; }, 400);
  }

  if (os === 'desktop' && window.InsiemeQR) {
    var target = PAGE_URL + (token ? '?t=' + token : '');
    var qr = window.InsiemeQR.encode(target);
    var border = 4;
    var dim = qr.size + border * 2;
    var svg = document.getElementById('qr');
    var ns = 'http://www.w3.org/2000/svg';
    svg.setAttribute('viewBox', '0 0 ' + dim + ' ' + dim);
    svg.setAttribute('shape-rendering', 'crispEdges');
    var bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('width', String(dim));
    bg.setAttribute('height', String(dim));
    bg.setAttribute('fill', '#FFFFFF');
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', window.InsiemeQR.toPath(qr, border));
    path.setAttribute('fill', '#14211D');
    svg.appendChild(bg);
    svg.appendChild(path);
  }
})();
