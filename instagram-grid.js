/* Instagram feed via Behold JSON. Renders tiles into any
   <div class="ig-feed" data-behold-url="https://feeds.behold.so/XXXX" data-count="8">.
   Read-only fetch that sets no cookies (Behold proxies the images), so it loads
   directly without requiring cookie consent, same model as the reviews grid.
   Feed URLs are scheme-checked (https only) before use. */
(function () {
  var nodes = document.querySelectorAll(".ig-feed[data-behold-url]");
  if (!nodes.length) return;

  function safe(u) { return (typeof u === 'string' && u.slice(0, 8) === 'https://') ? u : ''; }

  function render(box, data) {
    var count = parseInt(box.getAttribute("data-count"), 10) || 8;
    var posts = (data && data.posts ? data.posts : []).slice(0, count);
    if (!posts.length) return;
    // "plain" mode: bare <img> tags for the footer strip (whole strip already
    // links to the profile). Otherwise linked square tiles.
    var plain = box.hasAttribute("data-plain") || box.classList.contains("ig-strip-row");
    var html = "";
    posts.forEach(function (p) {
      var img = safe((p.sizes && (p.sizes.medium || p.sizes.small || p.sizes.large) || {}).mediaUrl
             || p.thumbnailUrl || p.mediaUrl);
      if (!img) return;
      if (plain) {
        html += '<img src="' + img + '" alt="" loading="lazy" decoding="async">';
        return;
      }
      var link = safe(p.permalink) || 'https://instagram.com/vanessaflow_yoga';
      var isVid = p.mediaType === "VIDEO";
      var isAlbum = p.mediaType === "CAROUSEL_ALBUM";
      html +=
        '<a class="igf-tile" href="' + link + '" target="_blank" rel="noopener" aria-label="View on Instagram">' +
        '<span class="igf-img" style="background-image:url(\'' + img + '\')"></span>' +
        (isVid ? '<span class="igf-badge" aria-hidden="true">▶</span>' :
         isAlbum ? '<span class="igf-badge" aria-hidden="true">▣</span>' : "") +
        "</a>";
    });
    box.innerHTML = html;
    box.classList.add("is-loaded");
  }

  function load(box) {
    var url = box.getAttribute("data-behold-url");
    if (!url || box.dataset.loaded) return;
    box.dataset.loaded = "1";
    fetch(url).then(function (r) { return r.json(); })
      .then(function (d) { render(box, d); })
      .catch(function () { box.dataset.loaded = ""; });
  }

  // Read-only fetch, no cookies set (Behold proxies the images), so it runs
  // without requiring cookie consent, same as the reviews grid.
  nodes.forEach(load);
})();
