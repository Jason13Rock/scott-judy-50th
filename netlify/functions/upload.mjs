import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const guestName = formData.get('guestName') || 'Guest';
    const guestEmail = formData.get('guestEmail') || '';
    const timestamp = formData.get('timestamp') || String(Math.floor(Date.now() / 1000));

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const cloudName = 'dgcbq2qlk';
    const apiKey = '673248496569678';
    const apiSecret = process.env.CLOUDINARY_SECRET;

    if (!apiSecret) {
      return new Response(JSON.stringify({ error: 'Server config error' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build Cloudinary signature
    const sigStr = `context=guestEmail=${guestEmail}|guestName=${guestName}&timestamp=${timestamp}&upload_preset=scott_judy_uploads${apiSecret}`;
    const signature = createHash('sha1').update(sigStr).digest('hex');

    // Forward to Cloudinary
    const cloudForm = new FormData();
    cloudForm.append('file', file);
    cloudForm.append('upload_preset', 'scott_judy_uploads');
    cloudForm.append('context', `guestName=${guestName}|guestEmail=${guestEmail}`);
    cloudForm.append('timestamp', timestamp);
    cloudForm.append('api_key', apiKey);
    cloudForm.append('signature', signature);

    const cloudResp = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      { method: 'POST', body: cloudForm }
    );

    const result = await cloudResp.json();

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      public_id: result.public_id,
      url: result.secure_url
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Upload failed' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/upload' };
