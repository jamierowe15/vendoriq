// Optional Slack alert. The app works without it, and a slow Slack never slows the API.
export async function notify(text) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) console.error('Slack notify failed', res.status);
  } catch (err) {
    console.error('Slack notify error', err.message);
  }
}
