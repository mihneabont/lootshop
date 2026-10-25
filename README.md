# Loot Shop Giveaway

A mobile-friendly web app for daily Loot Shop giveaways. People sign up with
email, Google or Facebook, turn on notifications, and enter each giveaway for
free. The admin draws a winner, who is told by email, in-app message and push
notification, and then buys the product on lootshop.ro at the giveaway price.

- **Next.js 16** (App Router, server actions), Tailwind CSS 4
- **Supabase**: Postgres, auth, row-level security, realtime messages
- **Web push** with VAPID keys (works on Android, desktop, and on iPhone once
  the site is added to the Home Screen, iOS 16.4+)
- **Resend** for email, optional **WooCommerce** coupons for winners
- Hosted on **Vercel**

## How it works

1. Admin creates a giveaway (draft) at `/admin/new`.
2. Admin publishes it; everyone with notifications on gets a push.
3. Signed-in users enter for free, once per giveaway, while it is open.
4. After it closes, the admin presses **Extrage câștigătorul**. The database
   picks a random eligible entry with a cryptographically secure random number
   and logs the draw (`draws` table).
5. The winner gets an email, an in-app message and a push. If the giveaway has
   a WooCommerce product id and the shop's API keys are set, a single-use
   coupon for the discount is created automatically and included.
6. The admin talks to the winner in the app or by email, marks the win as
   bought, or forfeits it and redraws.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) (region: Frankfurt).
2. In **SQL Editor**, run `supabase/migrations/20261025000000_init.sql`
   (or `supabase db push` with the CLI).
3. **Authentication → URL configuration**: set Site URL to your site address
   and add `https://YOUR-SITE/auth/callback` to Redirect URLs.
4. **Authentication → Providers**: enable Email, Google and Facebook (each
   needs a client id and secret from Google Cloud and Meta for Developers).
5. **Authentication → Emails → SMTP**: use Resend's SMTP so confirmation
   emails come from your domain.
6. Sign up on the site with your own account, then make it the admin:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@lootshop.ro';
   ```

### 2. Keys

Copy `.env.example` to `.env.local` and fill it in. Generate push keys with:

```bash
npx web-push generate-vapid-keys
```

For WooCommerce coupons, create a Read/Write key in WordPress under
**WooCommerce → Settings → Advanced → REST API**.

### 3. Run locally

```bash
npm install
npm run dev
```

### 4. Deploy

Import the GitHub repo in [Vercel](https://vercel.com/new), add the same
environment variables, and deploy. Every push to `main` redeploys. A subdomain
like `giveaway.lootshop.ro` can point to Vercel with one CNAME record.

## Before launch

- Fill in the organizer details (`NEXT_PUBLIC_COMPANY_*`) and have a lawyer
  review `/rules` and `/privacy`.
- Keep entry free: no paid entries or extra tickets, or the campaign becomes a
  game of chance that needs an ONJN licence.
- Brand colors live at the top of `src/app/globals.css`.
