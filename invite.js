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
    "lead": "Insieme is your home’s shared memory: deadlines, shopping, appointments and chores, each with a date and someone on it. You’re in after three steps, all below.",
    "leadShort": "Insieme is your home’s shared memory: deadlines, shopping, appointments and chores, each with a date and someone on it.",
    "offTitle": "You’re offline",
    "offBody": "You can download Insieme as soon as you’re back online.",
    "iosTitle": "For now Insieme is Android only",
    "iosBody": "We’ll let you know when it arrives on iPhone: leave us your email, nothing else needed.",
    "iosButton": "Tell me about iPhone",
    "iosAndroid": "Have an Android phone too? Open this link there and follow the three steps.",
    "s1Title": "Get Insieme",
    "s1Body": "The file is big, about 200 MB: better on Wi-Fi. You get it from GitHub, the site where we publish the app.",
    "desktopS1": "On your Android phone: about 200 MB, from GitHub, the site where we publish the app.",
    "s1Button": "Download for Android",
    "s1Size": "APK file · about 200 MB · from GitHub",
    "s2Title": "Install",
    "desktopS2": "Android will show you three warnings: open this page on the phone and it tells you what to tap for each.",
    "s2Intro": "Android will show you three warnings, in the order they appear. They are normal: it happens with every app that does not come from the Play Store, and Insieme is not there yet. The exact words vary a little from phone to phone.",
    "w1When": "Warning 1 · as you download",
    "w1Shown": "You see: “This type of file can harm your device”",
    "w1Tap": "Tap “Download anyway”",
    "w1Why": "It appears because the app is not on the Play Store yet. The file is signed by us.",
    "w2When": "Warning 2 · when you open the file",
    "w2Shown": "You see: “Install unknown apps”",
    "w2Tap": "Tap “Settings › Allow from this source”",
    "w2Why": "Android asks for your OK because the file comes from the browser, not the Play Store. Then go back and tap “Install”.",
    "w3When": "Warning 3 · before it installs",
    "w3Shown": "You see: “Unsafe app” and “Scan app”",
    "w3Tap": "Tap “Install anyway”",
    "w3Why": "Play Protect does not know Insieme yet, because it is new. The file is signed: it is exactly what we publish.",
    "bridge": "After installing, come back to this page and tap “Open the invite”.",
    "s3Title": "Open the invite",
    "s3Body": "With Insieme installed, tap here: the invite opens in the app. Then you sign in with your email, no password.",
    "s3Button": "Open the invite in Insieme",
    "s3Fallback": "Doesn’t open? In Insieme tap “I have an invite” and type or paste this code:",
    "codeLabel": "Invite code",
    "copy": "Copy the code",
    "copied": "Code copied",
    "copiedLabel": "Now paste it in Insieme, where you tap “I have an invite”.",
    "copyFailTitle": "I can’t copy it by myself",
    "copyFailBody": "Press and hold the code and choose “Copy”.",
    "noTokenTitle": "This link has no valid code",
    "noTokenBody": "The code is missing, incomplete or the invite has expired (they last 7 days). Ask whoever invited you to send a new one.",
    "s3NoToken": "With Insieme installed, tap the invite link in the message you received: it opens in the app.",
    "note": "The invite is valid for 7 days and works once. If you don’t know who sent it, ignore it.",
    "qrLabel": "QR code of this page",
    "qrTitle": "Open this page on your phone",
    "qrBody": "Scan the code with your Android phone’s camera: the invite is already in it.",
    "trust": "The code stays in your browser: the page sends it to no one and uses no cookies and no analytics.",
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
  var relabel = function () { /* set once there is a code */ };
  function t(key) { return (lang === 'en' ? EN : IT)[key]; }

  function applyLang(next) {
    lang = next;
    root.setAttribute('lang', lang);
    document.title = t('title');
    texts.forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    labels.forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-label'))); });
    relabel();
    var langButton = document.getElementById('lang');
    langButton.setAttribute('lang', lang === 'en' ? 'it' : 'en');
    document.querySelectorAll('[data-href-en]').forEach(function (link) {
      if (!link.hasAttribute('data-href-it')) link.setAttribute('data-href-it', link.getAttribute('href'));
      link.setAttribute('href', link.getAttribute('data-href-' + lang));
    });
  }

  applyLang(readLang());
  document.getElementById('lang').addEventListener('click', function () {
    applyLang(lang === 'en' ? 'it' : 'en');
    var next = new URLSearchParams(window.location.search);
    next.set('lang', lang);
    try { window.history.replaceState(null, '', '?' + next.toString() + window.location.hash); } catch { /* file:// or a sandbox: the switch still works */ }
  });

  // Offline: say so (the download needs the network); the rest of the page still works.
  var offline = document.getElementById('offline');
  function showOnline() { offline.classList.toggle('hidden', navigator.onLine !== false); }
  window.addEventListener('online', showOnline);
  window.addEventListener('offline', showOnline);
  showOnline();

  if (token) {
    var deepLink = SCHEME + '://invite/' + token;
    document.getElementById('open').setAttribute('href', deepLink);
    // The code in groups of four, easier to read aloud and to type; the groups are spaced by CSS, so a long-press
    // copy still gives the 32 characters without spaces.
    var codeEl = document.getElementById('code');
    token.match(/.{4}/g).forEach(function (group) {
      var span = document.createElement('span');
      span.textContent = group;
      codeEl.appendChild(span);
    });
    var copyButton = document.getElementById('copy');
    var copyLabel = document.getElementById('copy-label');
    var copiedHint = document.getElementById('copied-hint');
    var copyFail = document.getElementById('copy-fail');
    var copied = false;
    relabel = function () { copyLabel.textContent = t(copied ? 'copied' : 'copy'); };
    copyButton.addEventListener('click', function () {
      var done = function () {
        copied = true;
        copyButton.classList.add('is-copied');
        copiedHint.classList.remove('hidden');
        copyFail.classList.add('hidden');
        relabel();
      };
      var failed = function () {
        var range = document.createRange();
        range.selectNodeContents(codeEl);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        copyFail.classList.remove('hidden');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(token).then(done, failed);
      else failed();
    });
    // With the app installed, Android opens the invite straight away; without it, nothing happens and the steps stay.
    if (os === 'android') setTimeout(function () { window.location.href = deepLink; }, 400);
  }

  if (os === 'desktop' && window.InsiemeQR) {
    // #t=, like the invite Edge Function's redirect: what follows # never leaves the phone's browser.
    var target = PAGE_URL + (token ? '#t=' + token : '');
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
