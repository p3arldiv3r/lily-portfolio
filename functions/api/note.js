// Cloudflare Pages Function: /api/note
// Replaces Netlify Forms for the "send me a note" form. Emails the
// submission via Resend (RESEND_API_KEY is a Cloudflare Pages env var,
// never exposed to the browser). NOTIFY_EMAIL is also an env var so the
// destination address doesn't have to live in the public repo.
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) {
    return json({ ok: false, error: 'server not configured' }, 500);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (err) {
    return json({ ok: false, error: 'invalid form submission' }, 400);
  }

  // Honeypot: a real visitor never fills this in. Pretend success so a bot
  // doesn't learn anything, just don't actually send the email.
  if ((formData.get('bot-field') || '').toString().trim()) {
    return json({ ok: true });
  }

  const name = (formData.get('name') || '').toString().trim();
  const message = (formData.get('message') || '').toString().trim();
  if (!message) {
    return json({ ok: false, error: 'message is required' }, 400);
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: env.NOTIFY_EMAIL,
      subject: name ? `new note from ${name}` : 'new note from your site',
      text: message,
    }),
  });

  if (!resp.ok) {
    return json({ ok: false, error: await resp.text() }, 502);
  }
  return json({ ok: true });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
