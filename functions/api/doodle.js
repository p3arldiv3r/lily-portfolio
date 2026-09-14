// Cloudflare Pages Function: /api/doodle
// Replaces Netlify Forms for the doodle pad. Saves the drawing to the
// Cloudflare KV review queue (see /review, doodles-list/-approve/-deny) so
// it can actually be approved or denied, not just seen in an email -- the
// KV write is best-effort, so a missing/misbehaving KV binding degrades to
// "email only" rather than breaking the whole submission. Also emails the
// PNG as an attachment via Resend as a heads-up / backup copy.
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

  const file = formData.get('doodle');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return json({ ok: false, error: 'no doodle file received' }, 400);
  }

  const buffer = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);

  if (env.DOODLES_KV) {
    try {
      const id = `doodle:${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      await env.DOODLES_KV.put(id, JSON.stringify({ image: base64, createdAt: new Date().toISOString() }));
    } catch (err) {
      // don't let a KV hiccup block the email path below
    }
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
      subject: 'new doodle submission',
      text: 'Someone drew you a doodle -- approve or deny it at /review, or see the attachment here.',
      attachments: [{ filename: 'doodle.png', content: base64 }],
    }),
  });

  if (!resp.ok) {
    return json({ ok: false, error: await resp.text() }, 502);
  }
  return json({ ok: true });
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
