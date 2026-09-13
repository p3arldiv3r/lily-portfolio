// Cloudflare Pages Function: /api/callback
// Step 2 of the Decap CMS "github" backend OAuth flow -- GitHub redirects
// here with a one-time `code`, which we exchange server-side (using the
// secret GITHUB_CLIENT_SECRET, never exposed to the browser) for an access
// token, then hand that token back to the CMS popup via postMessage in the
// exact format Decap's github backend expects.
function renderBody(status, content) {
  return `<!doctype html>
<script>
  (function () {
    function receiveMessage(message) {
      window.opener.postMessage(
        'authorization:github:${status}:${JSON.stringify(content)}',
        message.origin
      );
      window.removeEventListener('message', receiveMessage, false);
    }
    window.addEventListener('message', receiveMessage, false);
    window.opener.postMessage('authorizing:github', '*');
  })();
</script>`;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const client_id = env.GITHUB_CLIENT_ID;
  const client_secret = env.GITHUB_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    return new Response('Missing GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET environment variables', { status: 500 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  try {
    const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'user-agent': 'lily-portfolio-decap-oauth',
      },
      body: JSON.stringify({ client_id, client_secret, code }),
    });
    const result = await tokenResp.json();

    if (result.error || !result.access_token) {
      return new Response(renderBody('error', result), {
        status: 401,
        headers: { 'content-type': 'text/html;charset=UTF-8' },
      });
    }

    return new Response(
      renderBody('success', { token: result.access_token, provider: 'github' }),
      { status: 200, headers: { 'content-type': 'text/html;charset=UTF-8' } }
    );
  } catch (err) {
    return new Response(renderBody('error', { message: String(err) }), {
      status: 500,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    });
  }
}
