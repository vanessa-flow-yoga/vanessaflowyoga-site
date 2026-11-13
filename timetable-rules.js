/* Studio policy notices above the timetable: each button opens its <dialog>. */
(function () {
  document.querySelectorAll('.tt-rule[data-rule]').forEach(function (button) {
    var dialog = document.getElementById(button.getAttribute('data-rule'));
    if (!dialog || typeof dialog.showModal !== 'function') return;
    button.addEventListener('click', function () { dialog.showModal(); });
  });
  document.querySelectorAll('dialog.tt-rule-dlg').forEach(function (dialog) {
    dialog.querySelector('.tt-rule-x').addEventListener('click', function () { dialog.close(); });
    // Clicking the dimmed backdrop closes it; Escape closes natively.
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var r = dialog.getBoundingClientRect();
      var inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
      if (!inside) dialog.close();
    });
  });
})();
