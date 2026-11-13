/* Image facts used at build time: pixel dimensions (so the browser can reserve
   space and avoid layout shift) and the image sitemap (so Google Images can
   find photos shown on each page). Reads file headers only; no dependencies. */
const fs = require('node:fs');
const path = require('node:path');

function dimensions(file) {
  const b = fs.readFileSync(file);
  // PNG: width/height are the first fields of the IHDR chunk.
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return {width: b.readUInt32BE(16), height: b.readUInt32BE(20)};
  // JPEG: walk the markers until a start-of-frame segment.
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return {width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5)};
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
    return null;
  }
  // WebP: lossy (VP8), lossless (VP8L) or extended (VP8X).
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8 ') return {width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff};
    if (kind === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return {width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1};
    }
    if (kind === 'VP8X') return {width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1};
  }
  return null;
}

// Resolve an <img src> to a file inside the built site, or null for anything
// external, data: URIs or missing files.
function localFile(siteRoot, htmlFile, src) {
  if (!src || /^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith('data:')) return null;
  const clean = decodeURI(src.split(/[?#]/)[0]);
  const file = clean.startsWith('/') ? path.join(siteRoot, clean) : path.join(path.dirname(htmlFile), clean);
  if (!file.startsWith(siteRoot) || !fs.existsSync(file)) return null;
  return file;
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[2] ?? m[3]) : null;
};

// Adds width/height to local <img> tags that have neither, plus data-dims so
// the stylesheet keeps their height automatic (the attributes then only give
// the browser the aspect ratio). Returns the new HTML and the images found.
const SIZE_RULE = '<style>:where(img[data-dims]){width:auto;height:auto}</style>';

function processHtml(siteRoot, htmlFile, html, cache = new Map()) {
  const images = [];
  let added = false;
  const out = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = attr(tag, 'src');
    const file = localFile(siteRoot, htmlFile, src);
    if (!file) return tag;
    if (!cache.has(file)) cache.set(file, dimensions(file));
    const size = cache.get(file);
    images.push({src, file, alt: attr(tag, 'alt') || ''});
    if (!size || attr(tag, 'width') !== null || attr(tag, 'height') !== null) return tag;
    added = true;
    return tag.replace(/^<img\b/i, `<img width="${size.width}" height="${size.height}" data-dims`);
  });
  // Zero-specificity rule, so any width or height a page already sets wins.
  // Added per page because some pages (intro pass) use their own stylesheet.
  const result = added ? out.replace(/<\/head>/i, `${SIZE_RULE}\n</head>`) : out;
  return {html: result, images};
}

const xmlEscape = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Adds <image:image> entries to an existing sitemap. pageImages maps each
// page's canonical URL to absolute image URLs.
function addSitemapImages(xml, pageImages) {
  if (!xml.includes('xmlns:image=')) {
    xml = xml.replace(/<urlset\b([^>]*)>/, '<urlset$1 xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">');
  }
  return xml.replace(/<url>([\s\S]*?)<\/url>/g, (whole, inner) => {
    const loc = (inner.match(/<loc>([^<]+)<\/loc>/) || [])[1];
    const list = loc && pageImages.get(loc.trim());
    if (!list || !list.length || inner.includes('<image:image>')) return whole;
    const entries = list.map((u) => `<image:image><image:loc>${xmlEscape(u)}</image:loc></image:image>`).join('');
    return `<url>${inner}${entries}</url>`;
  });
}

module.exports = {dimensions, processHtml, addSitemapImages};
