# Site health check

The site health workflow runs daily at 08:17 UTC after this branch is approved and merged to `main`. It can also be run manually from GitHub Actions. It emails hello@charlie-harris.com and vanessa@vanessaflowyoga.co.uk **only when a check fails**.

Before merging, create a Resend account with a verified sending domain and add these GitHub Actions repository secrets:

- `RESEND_API_KEY`: a sending API key.
- `HEALTH_ALERT_FROM`: a verified sender, for example `Website Health <alerts@vanessaflowyoga.co.uk>`.

Run one manual workflow after merging to verify that the audit executes. To test email delivery safely, use a temporary local JSON report with a deliberate failure and run `node scripts/send-health-alert.cjs` with the two secrets set; do not add either secret to the repository. This setup is not active until the branch is merged and the secrets are configured.

The audit checks the sitemap and every listed public page, the separate admin sign-in and Identity service, thank-you page, internal links, the four Netlify form declarations, the Behold Instagram feed, Momence purchase links and reviews feed, and the GitHub repository. It writes a JSON report and exits non-zero on failures. It is read-only: it does **not** submit a form, confirm an email reached an inbox, click through checkout, or prove a consent-gated map is visible in every browser. Those require separate manual or synthetic browser testing. A third-party HTTP error can be a real outage or a block on automated requests; inspect before making site changes.

GitHub can disable scheduled workflows in a public repository after 60 days without repository activity. If this site becomes infrequently updated, move the schedule to a dedicated uptime service; do not treat the GitHub schedule as a permanent independent uptime guarantee.

Run locally with `node scripts/health-check.cjs`. To save a report, set `HEALTH_REPORT_PATH=health-report.json`. The live Instagram feed returned HTTP 402 on 22 September 2026 during the initial audit; this predates the new CMS branch and should be checked in Behold.
