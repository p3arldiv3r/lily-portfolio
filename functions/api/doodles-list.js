// Cloudflare Pages Function: /api/doodles-list
// Lists every doodle still waiting in the review queue (Cloudflare KV).
// Requires a GitHub token (Authorization: Bearer <token>) belonging to
// someone with write access to the repo -- see functions/_lib/githubAuth.js.
import { requireRepoWrite, json } from '../_lib/githubAuth.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  const auth = await requireRepoWrite(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  if (!env.DOODLES_KV) return json({ ok: false, error: 'KV not configured' }, 500);

  const list = await env.DOODLES_KV.list({ prefix: 'doodle:' });
  const items = [];
  for (const key of list.keys) {
    const raw = await env.DOODLES_KV.get(key.name);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      items.push({ id: key.name, image: data.image, createdAt: data.createdAt });
    } catch (err) {
      // skip a corrupted entry rather than fail the whole list
    }
  }
  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return json({ ok: true, items });
}
