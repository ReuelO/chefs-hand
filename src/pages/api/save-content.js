import fs from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

export const POST = async ({ request }) => {
  try {
    const { filename, content, collection } = await request.json();
    
    if (!filename || !content || !collection) {
      return new Response(JSON.stringify({ error: 'Missing filename, content or collection' }), { status: 400 });
    }

    const safeFilename = filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();

    // Read environment variables (Must be set in Cloudflare and local .env)
    const token = import.meta.env.GITHUB_TOKEN;
    const owner = import.meta.env.GITHUB_OWNER;
    const repo = import.meta.env.GITHUB_REPO;

    // Check if we should use GitHub mode (only in production when credentials are fully set)
    const isDev = import.meta.env.DEV;
    if (!isDev && token && owner && repo) {
      const filePath = `src/content/${collection}/${safeFilename}`;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      
      // Safely encode UTF-8 to Base64 in Edge/Worker environments
      const base64Content = btoa(unescape(encodeURIComponent(content)));

      // 1. Check if the file already exists to retrieve its SHA (required for updating existing files)
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

      // 2. Commit the file to GitHub
      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Chefs-Hand-App',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Content Update: Add/Edit ${safeFilename} via Generator`,
          content: base64Content,
          sha: sha // Included if updating, omitted if creating new
        })
      });

      const putData = await putRes.json();

      if (!putRes.ok) {
        throw new Error(putData.message || 'Failed to push to GitHub API');
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Content saved successfully to GitHub. Cloudflare will rebuild shortly.` 
      }), { status: 200 });

    } else {
      // Local Fallback Mode: Write file to local filesystem
      const filePath = path.join(process.cwd(), 'src', 'content', collection, safeFilename);
      
      // Ensure the collection folder exists
      const folderPath = path.dirname(filePath);
      await fs.mkdir(folderPath, { recursive: true });

      await fs.writeFile(filePath, content, 'utf8');

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Content saved successfully to local filesystem at ${filePath}` 
      }), { status: 200 });
    }
    
  } catch (error) {
    console.error('Error saving content:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to save content', 
      details: error.message 
    }), { status: 500 });
  }
};
