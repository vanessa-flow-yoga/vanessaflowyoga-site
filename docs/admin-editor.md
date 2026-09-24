# Vanessa Flow Yoga admin: separate Netlify project

The admin is a **new Netlify project**, not a path on the customer-facing website project. For now, use the new project's own `*.netlify.app` address. Add `admin.vanessaflowyoga.co.uk` only when DNS and the custom domain are ready. The project can use the **same GitHub repository** as the website; it does not need a second repository or a second copy of the content.

## Two builds from the same repository

- Customer website Netlify project (`vanessaflow`): repository root, `netlify.toml` at root, normal `npm run build`, publishes `_site`, and keeps `/admin` returning 404.
- New admin Netlify project: connect the **same** repository but set its base directory to `admin-app`. Its own `admin-app/netlify.toml` runs `npm run build` and publishes `dist`, with Functions under `admin-app/netlify/functions`. No special environment variable is needed to select the admin build. The admin build includes `/admin/`, sends the new project's root there, and adds `X-Robots-Tag: noindex, nofollow` across the preview mirror. Public site pages are copied into this separate build solely so unsaved wording previews can use the real layout without cross-origin access.

The old Sveltia GitHub-login editor and OAuth functions are retired. Do not re-enable them. The browser receives no GitHub write credential.

## One-time setup on the **new** project

1. Verify the Netlify project is connected to exactly `vanessa-flow-yoga/vanessaflowyoga-site` and has its own `*.netlify.app` address. Do not use a cached CLI target or another business's Netlify account.
2. Enable Netlify Identity, set registration to **Invite only**, and leave external/social login disabled. Invite `hello@charlie-harris.com` and `vanessa@vanessaflowyoga.co.uk`; give each the `admin` role. They choose their own passwords from invitation emails. Future admins can be added in Identity Users.
3. Store a fine-grained GitHub credential with Contents read/write permission for **only** `vanessa-flow-yoga/vanessaflowyoga-site` as the new Netlify project's server-side secret `VFY_GITHUB_CONTENT_TOKEN`. Never commit or display its value. If the organisation requires a GitHub App instead of a personal token, adapt the server function before launch.
4. Test sign-in, password recovery, content reads, preview, denied access for a non-admin, save conflicts, new posts, image upload, timetable, retreats and prices. Writes are disabled by default. For safe testing, set `VFY_ADMIN_WRITE_BRANCH` to a dedicated review branch **only on the new project**. Netlify branch deploys are not automatic unless configured.
5. Only after successful tests and owner approval, set `VFY_ADMIN_WRITE_BRANCH=main` on the new project. **Publish changes** then commits site content to GitHub; the customer-facing project deploys from that commit. Images currently upload at selection time to the configured branch, so production writes need that behavior accepted or revised first.
6. Later, add `admin.vanessaflowyoga.co.uk` as a custom domain on this **new** project, verify TLS and login, then update DNS. Do not change nameservers, MX or TXT records.

## Current state (24 September 2026)

The separate admin project is live at `https://admin.vanessaflowyoga.co.uk/admin/` and `https://vanessa-flow-yoga-admin.netlify.app/admin/`. Charlie confirmed successful sign-in and a direct live publish. The admin write branch is `main`. The former customer-site `/admin/` remains removed. The GitHub content token expires on 24 October 2026 and must be rotated before then.

Media, Site health, and optional per-post SEO editing have been deployed. Signed-in health controls still need Charlie/Vanessa verification. The health screen runs technical cookie-gating, responsive setup and server-response checks automatically. A full legal GDPR review, real-user speed score and pixel-perfect mobile review cannot be inferred from those checks. Form delivery requires a real test submission and inbox receipt confirmation. Alert email is **not active** until the admin Netlify project has a verified mail sender and `RESEND_API_KEY` plus `HEALTH_ALERT_FROM` in its Functions environment, followed by a real delivered test. The email recipients and alert categories are edited in the admin after deployment.
