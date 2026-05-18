import fs from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

export const POST = async ({ request }) => {
  try {
    const preferencesData = await request.json();
    
    // Validate inputs slightly
    if (!preferencesData.themeColor || !preferencesData.brandSubtitle) {
      return new Response(JSON.stringify({ error: 'Missing themeColor or brandSubtitle' }), { status: 400 });
    }

    const token = import.meta.env.GITHUB_TOKEN;
    const owner = import.meta.env.GITHUB_OWNER;
    const repo = import.meta.env.GITHUB_REPO;
    const isDev = import.meta.env.DEV;

    const fileContentStr = JSON.stringify(preferencesData, null, 2);
    const filePath = 'src/data/preferences.json';

    if (!isDev && token && owner && repo) {
      // Production: Save preferences to GitHub
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      const base64Content = btoa(unescape(encodeURIComponent(fileContentStr)));

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
      // Local: Write directly to filesystem
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
