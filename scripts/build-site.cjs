#!/usr/bin/env node
/* Build the GitHub-backed website content edited through /admin. */
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '_site');
// _site is generated and ignored; clear it so no old admin files can ship.
fs.rmSync(output, {recursive: true, force: true});
const siteEleventy = path.join(root, 'node_modules', '.bin', 'eleventy');
const adminEleventy = path.join(root, 'admin-app', 'node_modules', '.bin', 'eleventy');
execFileSync(fs.existsSync(siteEleventy) ? siteEleventy : adminEleventy, [], {cwd: root, stdio: 'inherit'});
execFileSync(process.execPath, ['scripts/render-editor-content.cjs'], {cwd: root, stdio: 'inherit'});
const redirects = path.join(output, '_redirects');
// The customer-facing Netlify project must keep the retired /admin down.
fs.writeFileSync(redirects, '/admin  /404.html  404!\n/admin/*  /404.html  404!\n' + fs.readFileSync(redirects, 'utf8'));

const popup = require('../shared/popup.cjs');
const popupData = JSON.parse(fs.readFileSync(path.join(root, 'content/popup.json'), 'utf8'));
const popupError = popup.validate(popupData);
if (popupError) throw new Error(popupError);
function injectPopup(folder) {
  for (const entry of fs.readdirSync(folder, {withFileTypes:true})) {
    const file = path.join(folder,entry.name);
    if (entry.isDirectory()) injectPopup(file);
    else if (entry.name.endsWith('.html') && !['404.html','thankyou.html','thanks.html','retreat-thank-you.html'].includes(entry.name)) {
      const html = fs.readFileSync(file,'utf8');
      fs.writeFileSync(file,html.replace(/<\/head>/i,'<link rel="stylesheet" href="/site-popup.css">\n<script src="/site-popup.js" defer></script>\n</head>'));
    }
  }
}
injectPopup(output);

// Image SEO pass over the finished pages: reserve space for local images and
// list each page's meaningful photos in the sitemap for Google Images.
const imageMeta = require('../shared/image-meta.cjs');
const SITE = 'https://vanessaflowyoga.co.uk';
const pageImages = new Map();
const sizeCache = new Map();
const isLogo = (src) => /(?:^|\/)(?:new-)?logo\.png$/i.test(src.split(/[?#]/)[0]);
(function walk(folder) {
  for (const entry of fs.readdirSync(folder, {withFileTypes:true})) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!entry.name.endsWith('.html')) continue;
    const before = fs.readFileSync(file, 'utf8');
    const {html, images} = imageMeta.processHtml(output, file, before, sizeCache);
    if (html !== before) fs.writeFileSync(file, html);
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/i) || [])[1];
    if (!canonical) continue;
    const urls = [...new Set(images.filter((i) => i.alt.trim() && !isLogo(i.src))
      .map((i) => SITE + '/' + path.relative(output, i.file).split(path.sep).map(encodeURIComponent).join('/')))];
    if (urls.length) pageImages.set(canonical, urls);
  }
})(output);
const sitemapFile = path.join(output, 'sitemap.xml');
const sitemap = fs.readFileSync(sitemapFile, 'utf8');
const withImages = imageMeta.addSitemapImages(sitemap, pageImages);
fs.writeFileSync(sitemapFile, withImages);
console.log(`Image pass: ${sizeCache.size} images sized, ${(withImages.match(/<image:image>/g) || []).length} sitemap image entries`);
