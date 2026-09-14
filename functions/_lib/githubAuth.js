// Shared by the doodle-review endpoints. Verifies a GitHub OAuth token
// (the same kind Decap's github backend gets from /api/auth + /api/callback)
// actually belongs to someone with write access to this repo, so the
// review/approve/deny endpoints aren't just "anyone with a GitHub account."
export async function requireRepoWrite(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, error: 'missing token' };

  const repo = env.GITHUB_REPO || 'p3arldiv3r/lily-portfolio';
  let resp;
  try {
    resp = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Authorization: `token ${token}`,
        'user-agent': 'lily-portfolio-doodle-review',
        accept: 'application/vnd.github+json',
      },
    });
  } catch (err) {
    return { ok: false, status: 502, error: 'could not reach GitHub' };
  }
  if (!resp.ok) return { ok: false, status: 401, error: 'invalid token' };

  const data = await resp.json();
  if (!data.permissions || !data.permissions.push) {
    return { ok: false, status: 403, error: 'no write access to repo' };
  }
  return { ok: true, token, repo };
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
