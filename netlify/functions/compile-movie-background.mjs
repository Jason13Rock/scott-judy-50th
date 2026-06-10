// compile-movie-background.mjs
// Manual trigger: POST /.netlify/functions/compile-movie-background
// Runs in background (up to 15 min). Sends push notification via ntfy.sh when done.
// Subscribe to notifications: https://ntfy.sh/scott-judy-50th-movie-june2026
//   -> Download ntfy app, subscribe to topic: scott-judy-50th-movie-june2026

const CLOUD     = 'dgcbq2qlk';
const CLD_KEY   = '763495397731522';
const CLD_SECRET = process.env.CLOUDINARY_SECRET;
const J2V_KEY   = 'JH5uWEOph9eOMvfXbqGck19VM8sIgfwf2B1BCyHp';
const NTFY      = 'scott-judy-50th-movie-june2026';
// NOTE: Change RESOLUTION to '4k' for party day (3840x2160) — requires paid JSON2Video credits
//       '4k' uses 4x credits vs 'full-hd'. Free plan has 600 credits = ~10 min of 1080p.
const RESOLUTION = 'full-hd';

export default async (req, context) => {
  // Netlify background functions: response is auto 202, this body runs async
  await compileMovie();
};

async function compileMovie() {
  try {
    // 1. Fetch all videos from Cloudinary
    const auth = btoa(CLD_KEY + ':' + CLD_SECRET);
    const cldResp = await fetch(
      'https://api.cloudinary.com/v1_1/' + CLOUD + '/resources/video?max_results=500',
      { headers: { Authorization: 'Basic ' + auth } }
    );
    const cldData = await cldResp.json();
    const videos = (cldData.resources || []).sort((a, b) => a.created_at.localeCompare(b.created_at));
    console.log('[compile-movie] Found', videos.length, 'videos');

    if (!videos.length) {
      await ntfy('No videos uploaded to Cloudinary yet. Have guests record some first!', 'No Videos Found');
      return;
    }

    // 2. Build scenes
    const titleHtml = '<div style="background:#1a0a2e;width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:Georgia,serif;padding:40px;box-sizing:border-box;">'
      + '<p style="color:#f0c060;font-size:72px;text-align:center;margin:0;line-height:1.2">Scott &amp; Judy</p>'
      + '<p style="color:white;font-size:44px;text-align:center;margin:20px 0;letter-spacing:1px">50 Years Together</p>'
      + '<p style="color:#aaa;font-size:30px;text-align:center;margin:0">June 17, 2026</p>'
      + '<p style="color:#f0c060;font-size:40px;text-align:center;margin:24px 0">&#10084;&#65039;</p>'
      + '</div>';

    const endHtml = '<div style="background:#1a0a2e;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;">'
      + '<p style="color:#f0c060;font-size:52px;text-align:center;line-height:1.5">With Love &amp; Congratulations&#10084;&#65039;</p>'
      + '</div>';

    const scenes = [
      { comment: 'Title card', duration: 6, elements: [{ type: 'html', html: titleHtml, width: 1920, height: 1080, duration: 6 }] },
      ...videos.map((v, i) => ({
        comment: 'Guest clip ' + (i + 1) + ': ' + v.public_id,
        elements: [{ type: 'video', src: 'https://res.cloudinary.com/' + CLOUD + '/video/upload/f_mp4,q_auto/' + v.public_id, volume: 1 }]
      })),
      { comment: 'End card', duration: 5, elements: [{ type: 'html', html: endHtml, width: 1920, height: 1080, duration: 5 }] }
    ];

    // 3. Submit render
    const renderResp = await fetch('https://api.json2video.com/v2/movies', {
      method: 'POST',
      headers: { 'x-api-key': J2V_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution: RESOLUTION, quality: 'high', scenes })
    });
    const renderData = await renderResp.json();
    const projectId = renderData.project;
    console.log('[compile-movie] Submitted project:', projectId, JSON.stringify(renderData));

    if (!projectId) {
      await ntfy('Render submit failed: ' + JSON.stringify(renderData), 'Render Error');
      return;
    }
    await ntfy('Rendering ' + videos.length + ' guest clips...\nProject: ' + projectId, 'Rendering Started');

    // 4. Poll for completion (up to 12 min, 5s intervals)
    let url = null;
    for (let i = 0; i < 144; i++) {
      await sleep(5000);
      const stResp = await fetch('https://api.json2video.com/v2/movies?project=' + projectId, {
        headers: { 'x-api-key': J2V_KEY }
      });
      const stData = await stResp.json();
      const status = stData.movie?.status;
      url = stData.movie?.url;
      console.log('[compile-movie] Poll', i + 1, '| status:', status);
      if (status === 'done' && url) break;
      if (status === 'error') { await ntfy('Render failed for project ' + projectId, 'Error'); return; }
    }

    // 5. Notify
    if (url) {
      await ntfy('Movie ready! ' + videos.length + ' clips compiled.\n\nWatch: ' + url, '&#127909; Scott & Judy Movie Ready!');
      console.log('[compile-movie] DONE:', url);
    } else {
      await ntfy('Timed out. Check json2video.com dashboard for project ' + projectId, 'Timed Out');
    }
  } catch (err) {
    console.error('[compile-movie] Error:', err);
    await ntfy('Error: ' + err.message, 'Compile Error');
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ntfy(msg, title) {
  try {
    await fetch('https://ntfy.sh/' + NTFY, {
      method: 'POST', body: msg,
      headers: { Title: title, Priority: 'high', Tags: 'movie_camera' }
    });
  } catch (e) { console.error('[ntfy]', e); }
}
