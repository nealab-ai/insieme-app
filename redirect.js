// Old invite address (#1532): go to https://insieme.day/invito/ keeping the invite. Nothing is sent anywhere by this script.
(function () {
  'use strict';
  var PAGE_URL = 'https://insieme.day/invito/';
  var TOKEN = /^[0-9a-f]{32}$/i;
  var hash = location.hash;
  if (hash === '' || hash === '#') {
    var last = location.pathname.split('/').filter(Boolean).pop() || '';
    var query = new URLSearchParams(location.search).get('t') || '';
    var token = TOKEN.test(last) ? last : TOKEN.test(query) ? query : '';
    hash = token === '' ? '' : '#t=' + token.toLowerCase();
  }
  location.replace(PAGE_URL + hash);
})();
