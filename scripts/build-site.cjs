#!/usr/bin/env node
/* Build the GitHub-backed website content edited through /admin. */
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const isAdminProject = process.env.VFY_ADMIN_PROJECT === '1';
const output = path.join(root, '_site');
// _site is generated and ignored; clear it so switching build modes cannot
// leave the admin app in a customer-site deploy by accident.
fs.rmSync(output, {recursive: true, force: true});
execFileSync(path.join(root, 'node_modules', '.bin', 'eleventy'), [], {cwd: root, stdio: 'inherit'});
execFileSync(process.execPath, ['scripts/render-editor-content.cjs'], {cwd: root, stdio: 'inherit'});
const redirects = path.join(output, '_redirects');
const headers = path.join(output, '_headers');
if (isAdminProject) {
  execFileSync(path.join(root, 'node_modules', '.bin', 'esbuild'), [
    'scripts/admin-app.js', '--bundle', '--format=iife', '--platform=browser',
    '--target=es2022', '--minify', '--outfile=_site/admin/app.js',
  ], {cwd: root, stdio: 'inherit'});
  fs.writeFileSync(redirects, '/  /admin/  302\n/admin  /admin/  301\n' + fs.readFileSync(redirects, 'utf8'));
  fs.writeFileSync(headers, '/*\n  X-Robots-Tag: noindex, nofollow\n\n' + fs.readFileSync(headers, 'utf8'));
} else {
  // The customer-facing Netlify project must keep the retired /admin down.
  fs.writeFileSync(redirects, '/admin  /404.html  404!\n/admin/*  /404.html  404!\n' + fs.readFileSync(redirects, 'utf8'));
}
