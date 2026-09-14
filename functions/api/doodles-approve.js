// Cloudflare Pages Function: /api/doodles-approve
// Approving a pending doodle commits it straight into the live site --
// the image file, plus a new entry in src/_data/doodles.json -- using the
// reviewer's own GitHub token (same one Decap's github backend uses), then
// removes it from the review queue. Requires repo write access (see
// functions/_lib/githubAuth.js).
import { requireRepoWrite, json } from '../_lib/githubAuth.js';

const REPO = 'p3arldiv3r/lily-portfolio';
const BRANCH = 'main';
const DOODLES_JSON_PATH = 'src/_data/doodles.json';

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
  const { id, display } = body || {};
  if (!id) return json({ ok: false, error: 'missing id' }, 400);

  const raw = await env.DOODLES_KV.get(id);
  if (!raw) return json({ ok: false, error: 'not found' }, 404);
  let entry;
  try {
    entry = JSON.parse(raw);
  } catch (err) {
    return json({ ok: false, error: 'corrupted queue entry' }, 500);
  }

  const gh = (path, opts = {}) =>
    fetch(`https://api.github.com${path}`, {
      ...opts,
      headers: {
        Authorization: `token ${auth.token}`,
        'user-agent': 'lily-portfolio-doodle-review',
        accept: 'application/vnd.github+json',
        ...(opts.headers || {}),
      },
    });

  // 1. commit the image file
  const filename = `doodle-${Date.now()}.png`;
  const imgPath = `src/images/doodles/${filename}`;
  const putImg = await gh(`/repos/${REPO}/contents/${imgPath}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Approve doodle: ${filename}`,
      content: entry.image,
      branch: BRANCH,
    }),
  });
  if (!putImg.ok) return json({ ok: false, error: `image commit failed: ${await putImg.text()}` }, 502);

  // 2. read the current doodles.json (need its sha to update it) and append
  const getJson = await gh(`/repos/${REPO}/contents/${DOODLES_JSON_PATH}?ref=${BRANCH}`);
  if (!getJson.ok) return json({ ok: false, error: `read doodles.json failed: ${await getJson.text()}` }, 502);
  const jsonMeta = await getJson.json();
  let current;
  try {
    current = JSON.parse(decodeURIComponent(escape(atob(jsonMeta.content.replace(/\n/g, '')))));
  } catch (err) {
    return json({ ok: false, error: 'could not parse doodles.json' }, 500);
  }
  current.items = Array.isArray(current.items) ? current.items : [];
  current.items.push({
    image: `/images/doodles/${filename}`,
    display: display === 'background' ? 'background' : 'sticky',
    left: 200 + Math.floor(Math.random() * 1200),
    top: 150 + Math.floor(Math.random() * 500),
    caption: '',
  });

  const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(current, null, 2) + '\n')));
  const putJson = await gh(`/repos/${REPO}/contents/${DOODLES_JSON_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Approve doodle: add ${filename} to doodles.json`,
      content: newContent,
      sha: jsonMeta.sha,
      branch: BRANCH,
    }),
  });
  if (!putJson.ok) return json({ ok: false, error: `doodles.json commit failed: ${await putJson.text()}` }, 502);

  await env.DOODLES_KV.delete(id);
  return json({ ok: true });
}
