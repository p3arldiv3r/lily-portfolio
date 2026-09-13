// Cloudflare Pages Function: /api/auth
// Step 1 of the Decap CMS "github" backend OAuth flow -- redirects the CMS's
// login popup to GitHub's own authorize screen. GITHUB_CLIENT_ID is set as a
// Cloudflare Pages environment variable, never committed to the repo.
export async function onRequestGet(context) {
  const { request, env } = context;

  const client_id = env.GITHUB_CLIENT_ID;
  if (!client_id) {
    return new Response('Missing GITHUB_CLIENT_ID environment variable', { status: 500 });
  }

  const url = new URL(request.url);
  const redirectUrl = new URL('https://github.com/login/oauth/authorize');
  redirectUrl.searchParams.set('client_id', client_id);
  redirectUrl.searchParams.set('redirect_uri', url.origin + '/api/callback');
  redirectUrl.searchParams.set('scope', 'repo,user');
  redirectUrl.searchParams.set('state', crypto.randomUUID());

  return Response.redirect(redirectUrl.href, 302);
}
