export const prerender = false;

export const GET = async (context) => {
  const { request } = context;

  try {
    const getEnv = (key) => {
      return import.meta.env[key] || 
             (typeof process !== 'undefined' ? process.env[key] : null) || 
             (context.locals?.runtime?.env?.[key]);
    };

    const token = getEnv('GITHUB_TOKEN') || request.headers.get('x-github-token');
    const owner = getEnv('GITHUB_OWNER') || request.headers.get('x-github-owner');
    const repo = getEnv('GITHUB_REPO') || request.headers.get('x-github-repo');
    const isDev = import.meta.env.DEV;

    if (!isDev) {
      if (!token || !owner || !repo) {
        return new Response(JSON.stringify({ success: true, files: [] }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }

      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/public/uploads`;
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Chefs-Hand-App',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (res.status === 404) {
        // Directory doesn't exist yet on GitHub
        return new Response(JSON.stringify({ success: true, files: [] }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to list files from GitHub');
      }

      // Filter and map only image files
      const files = Array.isArray(data) 
        ? data
            .filter(item => item.type === 'file' && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(item.name))
            .map(item => `/uploads/${item.name}`)
        : [];

      return new Response(JSON.stringify({ success: true, files }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    } else {
      // Local development readdir
      const fs = await import(/* @vite-ignore */ 'node:fs/promises');
      const path = await import(/* @vite-ignore */ 'node:path');

      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        const dirFiles = await fs.readdir(uploadDir);
        const files = dirFiles
          .filter(name => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name))
          .map(name => `/uploads/${name}`);

        return new Response(JSON.stringify({ success: true, files }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: true, files: [] }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }
  } catch (error) {
    console.error('List uploads error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to list uploads', 
      details: error.message 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
