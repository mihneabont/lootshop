// Creates a single-use WooCommerce coupon for the winner, if the shop's REST
// API keys are configured. Returns null when WooCommerce is not set up.
export async function createWinnerCoupon(opts: {
  productId: number | null;
  discountRon: number;
  email: string | null;
}): Promise<string | null> {
  const site = Deno.env.get('WC_SITE_URL');
  const key = Deno.env.get('WC_CONSUMER_KEY');
  const secret = Deno.env.get('WC_CONSUMER_SECRET');
  if (!site || !key || !secret || !opts.productId) return null;

  const code = `LOOT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const res = await fetch(`${site.replace(/\/$/, '')}/wp-json/wc/v3/coupons`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${key}:${secret}`)}`,
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
      description: 'Loot Shop giveaway winner',
    }),
  });
  if (!res.ok) {
    console.error('WooCommerce coupon failed', res.status, await res.text());
    return null;
  }
  return code;
}
