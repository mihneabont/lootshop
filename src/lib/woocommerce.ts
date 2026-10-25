import 'server-only';

// Creates a single-use WooCommerce coupon for the winner, restricted to the
// giveaway product and the winner's email. Returns null when the shop's REST
// API keys or the product id are missing, so the admin can add a code by hand.
export async function createWinnerCoupon(opts: {
  productId: number | null;
  discountRon: number;
  email: string | null;
}): Promise<string | null> {
  const site = process.env.WC_SITE_URL;
  const key = process.env.WC_CONSUMER_KEY;
  const secret = process.env.WC_CONSUMER_SECRET;
  if (!site || !key || !secret || !opts.productId) return null;

  const code = `LOOT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const res = await fetch(`${site.replace(/\/$/, '')}/wp-json/wc/v3/coupons`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      discount_type: 'fixed_product',
      amount: opts.discountRon.toFixed(2),
      product_ids: [opts.productId],
      individual_use: true,
      usage_limit: 1,
      usage_limit_per_user: 1,
      limit_usage_to_x_items: 1,
      email_restrictions: opts.email ? [opts.email] : [],
      description: 'Câștigător giveaway Loot Shop',
    }),
  });
  if (!res.ok) {
    console.error('WooCommerce coupon failed', res.status, await res.text());
    return null;
  }
  return code;
}
