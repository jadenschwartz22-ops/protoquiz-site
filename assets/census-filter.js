// Census state pages: filter the agency list as you type.
(function () {
  var q = document.getElementById('agency-q'); if (!q) return;
  var none = document.querySelector('.sfind-none'), lis = [].slice.call(document.querySelectorAll('#agencies li'));
  q.addEventListener('input', function () {
    var t = q.value.trim().toLowerCase(), n = 0;
    lis.forEach(function (li) { var hit = !t || li.textContent.toLowerCase().indexOf(t) >= 0; li.hidden = !hit; if (hit) n++; });
    [].forEach.call(document.querySelectorAll('#agencies ul'), function (u) {
      var any = [].some.call(u.children, function (l) { return !l.hidden; }); u.hidden = !any;
      var h = u.previousElementSibling; if (h && h.tagName === 'H3') h.hidden = !any;
    });
    none.hidden = n > 0; none.textContent = n ? '' : 'No agency here matches “' + q.value.trim() + '”.';
  });
})();
