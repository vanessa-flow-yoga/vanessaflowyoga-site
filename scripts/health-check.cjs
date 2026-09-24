#!/usr/bin/env node
/* Read-only production health audit. No form submissions or customer data. */
const fs = require('node:fs');
const path = require('node:path');

const site = new URL(process.env.HEALTH_SITE_URL || 'https://vanessaflowyoga.co.uk');
const adminSite = new URL(process.env.HEALTH_ADMIN_URL || 'https://vanessa-flow-yoga-admin.netlify.app');
const timeoutMs = Number(process.env.HEALTH_TIMEOUT_MS || 15000);
const results = [];
const tested = new Set();

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}\n`);
}

async function request(url, options = {}) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'VanessaFlowYoga-HealthCheck/1.0' }, ...options });
  return response;
}

async function checkHttp(name, url, inspect) {
  try {
    const response = await request(url);
    const body = inspect && response.ok ? await response.text() : '';
    const valid = response.ok && (!inspect || inspect(body, response));
    record(name, valid, valid ? `${response.status}` : `${response.status} ${response.url}`);
    return { valid, body, response };
  } catch (error) {
    record(name, false, error.message);
    return { valid: false, body: '' };
  }
}

function links(html, pageUrl) {
  return [...html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)]
    .map(match => match[1].replace(/&amp;/g, '&'))
    .filter(href => !/^(?:#|mailto:|tel:|javascript:|data:)/i.test(href))
    .map(href => { try { return new URL(href, pageUrl); } catch { return null; } })
    .filter(Boolean);
}

async function main() {
  const sitemap = await checkHttp('Site and sitemap', new URL('/sitemap.xml', site), body => body.includes('<urlset'));
  if (!sitemap.valid) return finish();

  const pagePaths = [...new Set([...sitemap.body.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)]
    .map(match => { try { return new URL(match[1]).pathname; } catch { return ''; } }).filter(Boolean))];
  for (const essential of ['/thanks.html']) if (!pagePaths.includes(essential)) pagePaths.push(essential);
  await checkHttp('Separate admin sign-in', new URL('/admin/', adminSite), body => body.includes('Vanessa Flow Yoga'));
  await checkHttp('Admin identity service', new URL('/.netlify/identity/settings', adminSite), body => body.includes('external'));
  record('Sitemap has pages', pagePaths.length > 0, `${pagePaths.length} listed`);

  const internal = new Map();
  const thirdParty = new Set();
  const forms = new Map();
  let instagramFeed = '';
  let reviewsFeed = '';
  for (const pagePath of pagePaths) {
    const pageUrl = new URL(pagePath, site);
    const page = await checkHttp(`Page ${pagePath}`, pageUrl, body => /<html\b/i.test(body));
    if (!page.valid) continue;
    for (const link of links(page.body, pageUrl)) {
      if (link.origin === site.origin) internal.set(link.pathname + link.search, link);
      else if (/^(?:www\.)?momence\.com$/i.test(link.hostname)) thirdParty.add(link.href);
    }
    for (const match of page.body.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
      const name = match[1].match(/\bname=["']([^"']+)["']/i)?.[1];
      // Netlify removes data-netlify after recognising a deployed form.
      if (!name || !/method=["']POST["']/i.test(match[1])) continue;
      forms.set(name, { page: pagePath, markup: match[0] });
    }
    instagramFeed ||= page.body.match(/data-behold-url=["'](https:\/\/feeds\.behold\.so\/[^"']+)["']/i)?.[1] || '';
    if (!reviewsFeed) {
      const host = page.body.match(/id=["']reviewsGrid["'][^>]*data-host=["'](\d+)["']/i)?.[1];
      const signature = page.body.match(/id=["']reviewsGrid["'][^>]*data-signature=["']([a-f0-9]+)["']/i)?.[1];
      if (host && signature) reviewsFeed = `https://api.momence.com/host-plugins/host/${host}/reviews?pageSize=27&page=0&isFullLastNameVisible=false&isTextOnlyEnabled=true&isSessionAndTeacherInfoEnabled=true&s=${signature}`;
    }
  }

  for (const [linkPath, link] of internal) {
    if (tested.has(linkPath)) continue;
    tested.add(linkPath);
    await checkHttp(`Internal link ${linkPath}`, link);
  }

  for (const expected of ['contact', 'membership', 'application', 'retreat-interest']) {
    const form = forms.get(expected);
    const valid = !!form && new RegExp(`name=["']form-name["'][^>]*value=["']${expected}["']`, 'i').test(form.markup)
      && /method=["']POST["']/i.test(form.markup);
    record(`Form configuration ${expected}`, valid, form ? form.page : 'not found');
  }
  process.stdout.write('NOT TESTED Form delivery — requires a synthetic submission and inbox verification\n');

  if (instagramFeed) await checkHttp('Instagram feed (Behold)', instagramFeed, body => {
    try { return Array.isArray(JSON.parse(body).posts) && JSON.parse(body).posts.length > 0; } catch { return false; }
  });
  else record('Instagram feed (Behold)', false, 'Feed URL not found in pages');

  if (reviewsFeed) await checkHttp('Momence reviews feed', reviewsFeed, body => {
    try { return Array.isArray(JSON.parse(body).payload); } catch { return false; }
  });
  else record('Momence reviews feed', false, 'Reviews configuration not found in pages');

  const momenceUrls = [...thirdParty];
  record('Momence links present', momenceUrls.length > 0, `${momenceUrls.length} unique links`);
  // Check the booking hub and every membership purchase link, not every repeated class CTA.
  const keyMomenceUrls = momenceUrls.filter(url => /\/membership\/|\/u\/vanessa-flow-yoga|\/gcc\/13063/.test(url));
  for (const url of keyMomenceUrls) await checkHttp(`Momence ${new URL(url).pathname}`, url);

  await checkHttp('GitHub repository', 'https://api.github.com/repos/vanessa-flow-yoga/vanessaflowyoga-site', body => {
    try { return JSON.parse(body).full_name === 'vanessa-flow-yoga/vanessaflowyoga-site'; } catch { return false; }
  });
  finish();
}

function finish() {
  const failed = results.filter(result => !result.ok);
  const output = { checked_at: new Date().toISOString(), site: site.origin, passed: results.length - failed.length, failed: failed.length, results };
  if (process.env.HEALTH_REPORT_PATH) fs.writeFileSync(path.resolve(process.env.HEALTH_REPORT_PATH), JSON.stringify(output, null, 2));
  process.stdout.write(`\n${failed.length ? 'UNHEALTHY' : 'HEALTHY'}: ${output.passed} passed, ${failed.length} failed\n`);
  if (failed.length) process.exitCode = 1;
}

main().catch(error => { record('Health check execution', false, error.message); finish(); });
