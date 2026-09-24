# Vanessa Flow Yoga website studio

This folder is the **separate Netlify admin project** in the same GitHub repository as the public website. In Netlify, set the project's base directory to `admin-app`. Its own `netlify.toml` runs `npm run build`, publishes `dist`, and deploys Functions from `netlify/functions`.

The root of the admin project's `*.netlify.app` address redirects to `/admin/`. The customer-facing project at the repository root does not publish this folder as a page, and its `/admin` stays unavailable.

Run `npm ci`, `npm test`, and `npm run build` from this folder for local verification. The build includes a noindex copy of the website pages so the editor can preview wording in the actual layout.

Password sign-in and publishing require Netlify Identity (invite-only) plus the server-only GitHub writer credential on **this admin project**. No passwords or tokens belong in the repository. Setup details are in `../docs/admin-editor.md`.

The admin is now configured to publish to `main`; Charlie has confirmed a signed-in publish. Keep the site-specific token on this project only. The token expiry defaults to 24 October 2026 and can be overridden with `VFY_GITHUB_TOKEN_EXPIRES_AT` when rotated.

The Media library is a read-only index generated at build time. It shows file details and descriptions from each page placement; it does not edit image metadata. Every existing and new blog post has optional search title, search description, cover-image description, and social image fields. Blank search fields fall back to the current headline and summary, keeping older posts intact.

Site health runs daily and can be run manually after admin sign-in. It stores the latest report, recipients, notification choices, and manual check dates in a private Netlify Blobs store on this admin project. No extra database or shared account is used. The monitor checks responses, links, assets, security headers, basic SEO, form markup, integrations and GitHub. It does **not** submit forms, prove inbox delivery or certify GDPR, mobile layout or real-user speed. Record those in the hands-on check area after testing them.

Failure email needs `RESEND_API_KEY` and `HEALTH_ALERT_FROM` set for the admin project's Functions in Netlify. The sender must be verified with the mail provider. Until both are present and a real alert email is received, the admin displays that alerts are inactive. Alert recipients and red-check categories can then be changed inside Site health. Removing the scheduled function and the `vfy-health` Blobs data rolls back this monitor without affecting the public website.
