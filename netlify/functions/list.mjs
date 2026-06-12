import { createHash } from 'node:crypto';

export default async (request) => {
  const apiKey = '763495397731522';
  const apiSecret = process.env.CLOUDINARY_SECRET;
  const cloudName = 'dgcbq2qlk';

  const creds = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const resp = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/video?max_results=10&type=upload`,
    { headers: { 'Authorization': `Basic ${creds}` } }
  );
  const data = await resp.json();
  return new Response(JSON.stringify(data), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};

export const config = { path: '/api/list' };
