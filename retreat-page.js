/* Retreat landing page: hero video and room pre-selection. */
(function () {
  'use strict';
  var video = document.querySelector('[data-rt-video]');
  if (video) {
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var saveData = navigator.connection && navigator.connection.saveData;
    var start = function () {
      var source = video.querySelector('source');
      if (!source.src) { source.src = source.dataset.src; video.load(); }
      video.play().catch(function () {});
    };
    if (!motion.matches && !saveData) start();
    motion.addEventListener('change', function (event) { if (event.matches) video.pause(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) video.pause(); else if (!motion.matches && !saveData) video.play().catch(function () {}); });
  }
  var select = document.getElementById('rt-room');
  document.querySelectorAll('[data-room]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (!select) return;
      var name = link.getAttribute('data-room');
      Array.prototype.forEach.call(select.options, function (option) { if (option.text === name) select.value = option.value; });
    });
  });
})();
