// Cloudflare Pages Function: /api/doodles-deny
// Discards one pending doodle -- just removes it from the review queue,
// nothing gets committed anywhere. Requires repo write access (see
// functions/_lib/githubAuth.js).
import { requireRepoWrite, json } from '../_lib/githubAuth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const auth = await requireRepoWrite(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  if (!env.DOODLES_KV) return json({ ok: false, error: 'KV not configured' }, 500);

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ ok: false, error: 'invalid body' }, 400);
  }
  const { id } = body || {};
  if (!id) return json({ ok: false, error: 'missing id' }, 400);

  await env.DOODLES_KV.delete(id);
  return json({ ok: true });
}
