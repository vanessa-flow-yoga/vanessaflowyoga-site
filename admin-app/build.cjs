#!/usr/bin/env node
/* Standalone Netlify admin build with a same-origin copy of site pages for preview. */
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const adminRoot = __dirname;
const siteRoot = path.resolve(adminRoot, '..');
const dist = path.join(adminRoot, 'dist');
const siteOutput = path.join(siteRoot, '_site');
fs.rmSync(dist, {recursive: true, force: true});
execFileSync(process.execPath, ['scripts/build-site.cjs'], {cwd: siteRoot, stdio: 'inherit'});
fs.cpSync(siteOutput, dist, {recursive: true});
fs.cpSync(path.join(adminRoot, 'admin'), path.join(dist, 'admin'), {recursive: true});

const redirectsPath = path.join(dist, '_redirects');
const siteRedirects = fs.readFileSync(redirectsPath, 'utf8');
const retiredAdminRules = '/admin  /404.html  404!\n/admin/*  /404.html  404!\n';
if (!siteRedirects.startsWith(retiredAdminRules)) throw new Error('Expected public-site admin block is missing');
fs.writeFileSync(redirectsPath,
  '/  /admin/  302!\n/admin  /admin/  301!\n' + siteRedirects.slice(retiredAdminRules.length));

const headersPath = path.join(dist, '_headers');
fs.writeFileSync(headersPath,
  '/*\n  X-Robots-Tag: noindex, nofollow\n\n' + fs.readFileSync(headersPath, 'utf8'));

execFileSync(path.join(adminRoot, 'node_modules', '.bin', 'esbuild'), [
  'src/admin-app.js', '--bundle', '--format=iife', '--platform=browser',
  '--target=es2022', '--minify', '--outfile=dist/admin/app.js',
], {cwd: adminRoot, stdio: 'inherit'});
