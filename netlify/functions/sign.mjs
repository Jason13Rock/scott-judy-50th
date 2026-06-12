import { createHash } from 'node:crypto';

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { guestName, guestEmail, timestamp } = await request.json();
    const apiSecret = process.env.CLOUDINARY_SECRET;

    if (!apiSecret) {
      return new Response(JSON.stringify({ error: 'Server config error' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    const ts = timestamp || String(Math.floor(Date.now() / 1000));
    const name = guestName || 'Guest';
    const email = guestEmail || '';

    // Signature string must match params sent to Cloudinary exactly, sorted alphabetically
    const sigStr = `context=guestEmail=${email}|guestName=${name}&timestamp=${ts}&upload_preset=scott_judy_uploads${apiSecret}`;
    const signature = createHash('sha1').update(sigStr).digest('hex');

    return new Response(JSON.stringify({
      signature,
      timestamp: ts,
      apiKey: '763495397731522',
      cloudName: 'dgcbq2qlk',
      uploadPreset: 'scott_judy_uploads',
      context: `guestName=${name}|guestEmail=${email}`
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Sign failed' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/sign' };
