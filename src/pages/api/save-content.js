export const prerender = false;

export const POST = async ({ request }) => {
  try {
    const { filename, content, collection } = await request.json();
    
    if (!filename || !content || !collection) {
      return new Response(JSON.stringify({ error: 'Missing filename, content or collection' }), { status: 400 });
    }

    const safeFilename = filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
    const filePath = `src/content/${collection}/${safeFilename}`;

    // Read environment variables (Must be set in Cloudflare and local .env)
    const token = import.meta.env.GITHUB_TOKEN;
    const owner = import.meta.env.GITHUB_OWNER;
    const repo = import.meta.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
      return new Response(JSON.stringify({ 
        error: 'Missing GitHub configuration. Check environment variables: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO' 
      }), { status: 500 });
    }

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
    
  } catch (error) {
    console.error('Error saving content to GitHub:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to save content', 
      details: error.message 
    }), { status: 500 });
  }
};
