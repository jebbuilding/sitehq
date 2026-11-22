# Social media accounts linked to SiteHQ (for Jasper)

James (22 Nov 2026): "the social media suite can that be made to be able to link to the different social media and
then ill get jasper to sort the links to the different companies".

The app side is built (`src/app/owner/social-posts.js`). It asks the platform for one more capability,
`window.claude.use("social")`. On claude.ai that returns `null`, so the app shows "Linking works on the hosted
site once it has been set up" and posts go out through 📤 Share (the iPad's share sheet). On our hosting the adapter
(`src/platform/aws-adapter.js`) should return the object below **for the owner only**, backed by new server routes.

**The sign-ins (access and refresh tokens) live only on the server**, encrypted, per firm. They never go into the
database the app reads, never into `settings/app`, and never to the browser.

## The capability

```js
const social = await window.claude.use("social"); // owner only; null for trades, clients and on claude.ai

await social.status();
// → { facebook: { linked: true, name: "JEB Building Services" },
//     instagram: { linked: false }, linkedin: { linked: false }, google: { linked: true, name: "JEB Building Services" } }

await social.connect("facebook");
// → { url } – the provider's sign-in and permission page. The app goes there (window.location.assign);
//   the server's callback stores the tokens and sends him back to the app (e.g. /app#social-linked).

await social.disconnect("facebook"); // forgets the tokens (and revokes them where the provider allows)

await social.post({ platforms: ["facebook", "instagram"], texts: { facebook: "…", instagram: "…" },
                    photos: ["<asset id>", …], at: 0 });
// at = 0: post now → { results: { facebook: { ok: true, id, url }, instagram: { ok: false, code, message } } }
// at = ms timestamp: schedule it → { scheduled: "<job id>" } (the server posts it at that time, app shut or not)

await social.cancel("<job id>"); // a scheduled post (not used by the app yet)
```

Failures reject with `{ code, message }`; `code: "not_linked"` makes the app tell him to link the account again.
`message` is shown to James as it is, so keep it plain English.

Photos are asset ids from the app's file store (`/_blob/<id>`); the server reads them itself and uploads them to
each provider.

## The four providers

| Place (key) | What to link | API |
|---|---|---|
| `facebook` | the firm's Facebook **Page** (not his own profile) | Meta Graph API – Facebook Login for Business, `pages_manage_posts`, `pages_read_engagement`; post to `/{page-id}/photos` or `/feed` |
| `instagram` | Instagram **business/creator** account connected to that Page | Meta Graph API – `instagram_content_publish`; create a media container, then publish. Needs at least one photo |
| `linkedin` | the firm's LinkedIn **company page** | LinkedIn Community Management API – `w_organization_social`; Posts API with images uploaded first |
| `google` | the **Google Business Profile** | Business Profile API – local posts (`accounts/{a}/locations/{l}/localPosts`). The same link can bring new Google reviews into ⭐ Reviews (`todos/rv-*`, `source: "google"`) |

Meta and LinkedIn both need an app review before other firms can link their accounts. Each firm (stack) links its own
accounts; the app registrations (client ids and secrets) are ours, once.

## What the app keeps

The post record (`todos/sp-{id}`, `kind: "socialpost"`) gets `status: "posted" | "scheduled"`, `postedTo`,
`postedAt`, `postIds { platform: { id, url } }`, `scheduledAt`, `scheduleId`. When a scheduled post goes out (or
fails), the server should update that record (`status`, `postedAt`, `postIds`, or `failed: { platform: message }`) so
James sees it in 📣 Social media posts.

Each firm's public page addresses are in `settings/app.socialPages { platform: url }` (typed by James in 🔗 Linked
accounts; 📤 Share opens them). They are not sign-ins.
