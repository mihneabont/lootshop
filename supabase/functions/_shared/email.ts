// Sends email through Resend. Without RESEND_API_KEY it logs and skips.
export async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) {
    console.warn('RESEND_API_KEY not set; skipping email to', to);
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM') ?? 'Loot Shop <giveaway@lootshop.ro>',
      reply_to: Deno.env.get('EMAIL_REPLY_TO') || undefined,
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    console.error('Resend failed', res.status, await res.text());
    return false;
  }
  return true;
}

export const siteUrl = () => (Deno.env.get('SITE_URL') ?? 'https://lootshop.ro').replace(/\/$/, '');

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function emailLayout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td style="font-size:22px;font-weight:bold;padding-bottom:16px">${escapeHtml(title)}</td></tr>
<tr><td style="font-size:16px;line-height:1.5">${bodyHtml}</td></tr>
<tr><td style="font-size:12px;color:#71717a;padding-top:24px">Loot Shop · <a href="${siteUrl()}" style="color:#71717a">Giveaway</a></td></tr>
</table></td></tr></table></body></html>`;
}
