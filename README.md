# Loot Shop Giveaway

A mobile-friendly web app for daily Loot Shop giveaways. People sign up with
email, Google or Facebook, turn on notifications, and enter each giveaway for
free. The admin draws a winner, who is told by email, in-app message and push
notification, and then buys the product on lootshop.ro at the giveaway price.

**Live site:** https://mihneabont.github.io/lootshop/

- **Next.js 16** static export, hosted on **GitHub Pages**, Tailwind CSS 4
- **Supabase**: Postgres, auth, row-level security, realtime messages, and
  Edge Functions for the work that needs secrets (draw, email, push)
- **Web push** with VAPID keys (Android, desktop, and iPhone once the site is
  added to the Home Screen, iOS 16.4+)
- **Resend** for email, optional **WooCommerce** coupons for winners

## How it works

1. Admin creates a giveaway (draft) at `/admin/new`.
2. Admin publishes it; everyone with notifications on gets a push.
3. Signed-in users enter for free, once per giveaway, while it is open.
4. After it closes, the admin presses **Extrage câștigătorul**. The database
   picks a random eligible entry with a cryptographically secure random number
   and logs the draw (`draws` table).
5. The winner gets an email, an in-app message and a push. If the giveaway has
   a WooCommerce product id and the shop's API keys are set, a single-use
   coupon for the discount is created automatically.
6. The admin talks to the winner in the app or by email, marks the win as
   bought, or forfeits it and redraws.

## Layout

| Path | What |
| --- | --- |
| `src/app` | Pages (all static; data loads in the browser) |
| `supabase/migrations` | Database schema, security rules and the draw function |
| `supabase/functions` | Edge Functions: `notify-giveaway`, `draw-winner`, `send-message`, `delete-account` |
| `.github/workflows/pages.yml` | Builds and publishes the site on every push to `main` |
| `.github/workflows/supabase.yml` | Applies migrations and deploys functions when `supabase/` changes |

## Setup

### 1. GitHub Pages

Settings → Pages → Source: **GitHub Actions**. Then re-run the "Deploy site to
GitHub Pages" workflow from the Actions tab.

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com) (region: Frankfurt).
2. **Authentication → URL configuration**: Site URL
   `https://mihneabont.github.io/lootshop/`, and add
   `https://mihneabont.github.io/lootshop/**` to Redirect URLs.
3. **Authentication → Providers**: enable Google and Facebook (each needs a
   client id and secret from Google Cloud and Meta for Developers).
4. **Authentication → Emails → SMTP**: use Resend's SMTP so confirmation
   emails come from your domain.

### 3. GitHub secrets and variables

Settings → Secrets and variables → Actions.

**Variables** (public):

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Project URL from Supabase → Project Settings → API |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key from the same page |
| `VAPID_PUBLIC_KEY` | From `npx web-push generate-vapid-keys` |
| `SITE_URL` | `https://mihneabont.github.io/lootshop` |
| `CONTACT_EMAIL` | e.g. `contact@lootshop.ro` |
| `COMPANY_NAME`, `COMPANY_CUI`, `COMPANY_REG`, `COMPANY_ADDRESS` | Shown in the official rules |

**Secrets**:

| Name | Value |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access tokens |
| `SUPABASE_PROJECT_REF` | The id in your project URL |
| `SUPABASE_DB_PASSWORD` | Database password chosen when creating the project |
| `VAPID_PRIVATE_KEY` | The private half of the VAPID keys |
| `RESEND_API_KEY` | resend.com, after verifying lootshop.ro |
| `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET` | Optional: WooCommerce → Settings → Advanced → REST API (Read/Write) |

Then run both workflows from the Actions tab ("Deploy Supabase" first).

### 4. Make yourself admin

Sign up on the site, then in Supabase → SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@lootshop.ro';
```

## Local development

```bash
cp .env.example .env.local   # fill in the Supabase values
npm install
npm run dev
```

## Before launch

- Fill in the organizer details and have a lawyer review `/rules` and `/privacy`.
- Keep entry free: no paid entries or extra tickets, or the campaign becomes a
  game of chance that needs an ONJN licence.
- Brand colors live at the top of `src/app/globals.css`.
- A custom domain like `giveaway.lootshop.ro` can be set in Settings → Pages;
  update the Supabase URLs and `SITE_URL` to match.
