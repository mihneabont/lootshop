// Deletes the caller's account and, through cascades, all their data.
import { adminClient, handler, json, requireUser } from '../_shared/clients.ts';

Deno.serve(
  handler(async (req) => {
    const { user } = await requireUser(req);
    const { error } = await adminClient().auth.admin.deleteUser(user.id);
    if (error) throw error;
    return json({ ok: true });
  }),
);
