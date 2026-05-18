export const prerender = false;

// Edge-safe base64 encoder for UTF-8 strings
const toBase64 = (str) => {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf-8').toString('base64');
    }
  } catch {}
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = utf8Bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary);
};

export const POST = async (context) => {
  const { request } = context;

  try {
    const preferencesData = await request.json();
    
    // Validate inputs
    if (!preferencesData.themeColor || !preferencesData.brandSubtitle) {
      return new Response(JSON.stringify({ error: 'Missing themeColor or brandSubtitle' }), { status: 400 });
    }

    // Robust environment variable resolution supporting build-time, runtime, and Cloudflare Pages/Workers context
    const getEnv = (key) => {
      return import.meta.env[key] || 
             (typeof process !== 'undefined' ? process.env[key] : null) || 
             (context.locals?.runtime?.env?.[key]);
    };

    const token = getEnv('GITHUB_TOKEN') || request.headers.get('x-github-token');
    const owner = getEnv('GITHUB_OWNER') || request.headers.get('x-github-owner');
    const repo = getEnv('GITHUB_REPO') || request.headers.get('x-github-repo');
    const isDev = import.meta.env.DEV;

    const fileContentStr = JSON.stringify(preferencesData, null, 2);
    const filePath = 'src/data/preferences.json';

    if (!isDev) {
      // Production: Enforce GitHub integration (never attempt read-only filesystem writes)
      if (!token || !owner || !repo) {
        const missing = [];
        if (!token) missing.push('GITHUB_TOKEN');
        if (!owner) missing.push('GITHUB_OWNER');
        if (!repo) missing.push('GITHUB_REPO');
        return new Response(JSON.stringify({
          error: 'GitHub credentials missing',
          details: `The following environment variables are missing in your Cloudflare Pages production dashboard settings: ${missing.join(', ')}. Please add them under Cloudflare Dashboard > Settings > Environment Variables to enable online editing.`
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      const base64Content = toBase64(fileContentStr);

      // 1. Get SHA of preferences.json if it exists
      let sha;
      const getRes = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Chefs-Hand-App',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
      }

      // 2. Commit updated preferences.json
      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Chefs-Hand-App',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: 'Config Update: Save Site Preferences via Admin Dashboard',
          content: base64Content,
          sha: sha
        })
      });

      const putData = await putRes.json();

      if (!putRes.ok) {
        throw new Error(putData.message || 'Failed to commit preferences to GitHub');
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Preferences successfully saved to GitHub. Rebuilding.'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } else {
      // Local: Write directly to filesystem using dynamic dynamic imports
      const fs = await import(/* @vite-ignore */ 'node:fs/promises');
      const path = await import(/* @vite-ignore */ 'node:path');

      const localFilePath = path.join(process.cwd(), 'src', 'data', 'preferences.json');
      await fs.writeFile(localFilePath, fileContentStr, 'utf8');

      return new Response(JSON.stringify({
        success: true,
        message: 'Preferences successfully saved to local filesystem.'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    console.error('Error saving preferences:', error);
    return new Response(JSON.stringify({
      error: 'Failed to save preferences',
      details: error.message
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
