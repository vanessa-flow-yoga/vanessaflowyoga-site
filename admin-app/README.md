# Vanessa Flow Yoga website studio

This folder is the **separate Netlify admin project** in the same GitHub repository as the public website. In Netlify, set the project's base directory to `admin-app`. Its own `netlify.toml` runs `npm run build`, publishes `dist`, and deploys Functions from `netlify/functions`.

The root of the admin project's `*.netlify.app` address redirects to `/admin/`. The customer-facing project at the repository root does not publish this folder as a page, and its `/admin` stays unavailable.

Run `npm ci`, `npm test`, and `npm run build` from this folder for local verification. The build includes a noindex copy of the website pages so the editor can preview wording in the actual layout.

Password sign-in and publishing require Netlify Identity (invite-only) plus the server-only GitHub writer credential on **this admin project**. No passwords or tokens belong in the repository. Setup details are in `../docs/admin-editor.md`.
