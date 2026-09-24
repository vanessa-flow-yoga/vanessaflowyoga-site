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
