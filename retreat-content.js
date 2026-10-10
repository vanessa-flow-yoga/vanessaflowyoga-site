/* The general teaser stays separate from individual retreat pages. */
(function () {
  'use strict';
  if (!document.getElementById('retreatMain')) return;
  fetch('/content/retreats-general.json', {cache:'no-cache'})
    .then(function (response) { if (!response.ok) throw Error('Retreat content unavailable'); return response.json(); })
    .then(function (general) {
      if (general.schema_version !== '1.0') throw Error('Unknown retreat content format');
      document.querySelectorAll('[data-retreat-copy]').forEach(function (node) {
        var value = general[node.dataset.retreatCopy];
        if (typeof value === 'string') node.textContent = value;
      });
    }).catch(function (error) { console.warn('Keeping the built retreat teaser:', error); });
})();
