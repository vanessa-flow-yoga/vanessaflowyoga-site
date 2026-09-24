#!/usr/bin/env node
/* Send an alert only when the read-only audit recorded failures. */
const fs = require('node:fs');

const reportPath = process.env.HEALTH_REPORT_PATH || 'health-report.json';
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const failures = report.results.filter((result) => !result.ok);
if (!failures.length) {
  process.stdout.write('No health alert needed.\n');
  process.exit(0);
}

const key = process.env.RESEND_API_KEY;
const from = process.env.HEALTH_ALERT_FROM;
if (!key || !from) throw new Error('Health alert email is not configured: set RESEND_API_KEY and HEALTH_ALERT_FROM.');

const text = [
  `Vanessa Flow Yoga health check found ${failures.length} issue(s).`,
  `Checked: ${report.checked_at}`,
  `Site: ${report.site}`,
  '',
  ...failures.map((item) => `• ${item.name}${item.detail ? `: ${item.detail}` : ''}`),
  '',
  'The check does not submit forms or verify inbox delivery. Please inspect flagged items before changing the site.'
].join('\n');

fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    from,
    to: ['hello@charlie-harris.com', 'vanessa@vanessaflowyoga.co.uk'],
    subject: `Vanessa Flow Yoga: ${failures.length} website health alert${failures.length === 1 ? '' : 's'}`,
    text
  }),
  signal: AbortSignal.timeout(15000)
}).then(async (response) => {
  if (!response.ok) throw new Error(`Health alert email failed: ${response.status} ${await response.text()}`);
  process.stdout.write(`Health alert sent for ${failures.length} issue(s).\n`);
}).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
