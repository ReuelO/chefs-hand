export const prerender = false;

export const DELETE = async (context) => {
  const { url } = context;

  try {
    const collection = url.searchParams.get('collection');
    const id = url.searchParams.get('id');

    if (!collection || !id) {
      return new Response(JSON.stringify({ error: 'Missing collection or id parameters' }), { status: 400 });
    }

    const safeId = id.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
    const filePath = `src/content/${collection}/${safeId}.md`;

    // Robust environment variable resolution supporting build-time, runtime, and Cloudflare Pages/Workers context
    const getEnv = (key) => {
      return import.meta.env[key] || 
             (typeof process !== 'undefined' ? process.env[key] : null) || 
             (context.locals?.runtime?.env?.[key]);
    };

    const token = getEnv('GITHUB_TOKEN');
    const owner = getEnv('GITHUB_OWNER');
    const repo = getEnv('GITHUB_REPO');
    const isDev = import.meta.env.DEV;

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

      // 1. Get the current file's SHA (required for deleting in GitHub REST API)
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
      } else {
        return new Response(JSON.stringify({ error: 'File not found on GitHub' }), { status: 404 });
      }

      // 2. Perform the deletion commit
      const delRes = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Chefs-Hand-App',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Content Update: Delete ${safeId} via Admin Panel`,
          sha: sha
        })
      });

      const delData = await delRes.json();

      if (!delRes.ok) {
        throw new Error(delData.message || 'Failed to delete on GitHub');
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Content successfully deleted from GitHub. Rebuilding.' 
      }), { status: 200 });

    } else {
      // Local Development: Unlink from local disk using dynamic dynamic imports
      const fs = await import(/* @vite-ignore */ 'node:fs/promises');
      const path = await import(/* @vite-ignore */ 'node:path');

      const localFilePath = path.join(process.cwd(), 'src', 'content', collection, `${safeId}.md`);
      try {
        await fs.unlink(localFilePath);
        return new Response(JSON.stringify({ 
          success: true, 
          message: `Successfully deleted file locally at ${localFilePath}` 
        }), { status: 200 });
      } catch (err) {
        return new Response(JSON.stringify({ 
          error: 'File not found locally', 
          details: err.message 
        }), { status: 404 });
      }
    }

  } catch (error) {
    console.error('Error deleting content:', error);
    return new Response(JSON.stringify({
      error: 'Failed to delete content',
      details: error.message
    }), { status: 500 });
  }
};
