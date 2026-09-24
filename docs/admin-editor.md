# Vanessa Flow Yoga admin: separate Netlify project

The admin is a **new Netlify project**, not a path on the customer-facing website project. For now, use the new project's own `*.netlify.app` address. Add `admin.vanessaflowyoga.co.uk` only when DNS and the custom domain are ready. The project can use the **same GitHub repository** as the website; it does not need a second repository or a second copy of the content.

## Two builds from the same repository

- Customer website Netlify project (`vanessaflow`): normal `npm run build`, publishes `_site`, and keeps `/admin` returning 404.
- New admin Netlify project: connect `vanessa-flow-yoga/vanessaflowyoga-site`, use the same build command and publish directory from `netlify.toml`, and set project environment variable `VFY_ADMIN_PROJECT=1` for builds. This includes `/admin/`, sends the project's root to the admin, and adds `X-Robots-Tag: noindex, nofollow` across the preview mirror. Public site pages are mirrored here solely so unsaved wording previews can use the real layout without cross-origin access.

The old Sveltia GitHub-login editor and OAuth functions are retired. Do not re-enable them. The browser receives no GitHub write credential.

## One-time setup on the **new** project

1. Verify the Netlify project is connected to exactly `vanessa-flow-yoga/vanessaflowyoga-site` and has its own `*.netlify.app` address. Do not use a cached CLI target or another business's Netlify account.
2. Enable Netlify Identity, set registration to **Invite only**, and leave external/social login disabled. Invite `hello@charlie-harris.com` and `vanessa@vanessaflowyoga.co.uk`; give each the `admin` role. They choose their own passwords from invitation emails. Future admins can be added in Identity Users.
3. Store a fine-grained GitHub credential with Contents read/write permission for **only** `vanessa-flow-yoga/vanessaflowyoga-site` as the new Netlify project's server-side secret `VFY_GITHUB_CONTENT_TOKEN`. Never commit or display its value. If the organisation requires a GitHub App instead of a personal token, adapt the server function before launch.
4. Test sign-in, password recovery, content reads, preview, denied access for a non-admin, save conflicts, new posts, image upload, timetable, retreats and prices. Writes are disabled by default. For safe testing, set `VFY_ADMIN_WRITE_BRANCH` to a dedicated review branch **only on the new project**. Netlify branch deploys are not automatic unless configured.
5. Only after successful tests and owner approval, set `VFY_ADMIN_WRITE_BRANCH=main` on the new project. **Publish changes** then commits site content to GitHub; the customer-facing project deploys from that commit. Images currently upload at selection time to the configured branch, so production writes need that behavior accepted or revised first.
6. Later, add `admin.vanessaflowyoga.co.uk` as a custom domain on this **new** project, verify TLS and login, then update DNS. Do not change nameservers, MX or TXT records.

## Current state (24 September 2026)

The separate-project build mode is implemented locally and being tested. **No new Netlify project has been created or published.** Identity, invited users, GitHub writer credential and real sign-in/save remain unconfigured. The local preview is read-only. The previous customer-site `/admin/` was removed from production in commit `dec9c54` and verified as HTTP 404.
