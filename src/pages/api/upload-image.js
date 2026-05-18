export const prerender = false;

export const POST = async (context) => {
  const { request } = context;

  try {
    const { filename, base64Data } = await request.json();
    
    if (!filename || !base64Data) {
      return new Response(JSON.stringify({ error: 'Missing filename or image data' }), { status: 400 });
    }

    // Clean up filename and put it in uploads directory
    const cleanFilename = `${Date.now()}-${filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase()}`;
    const relativePath = `/uploads/${cleanFilename}`;

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

    // Check if we are running in production/GitHub mode or local mode
    if (!isDev && token && owner && repo) {
      // Production Mode: Commit the image directly to the GitHub repo!
      const filePath = `public/uploads/${cleanFilename}`;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Chefs-Hand-App',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Media Upload: Add ${cleanFilename} via Generator`,
          content: base64Data // Must be base64 string
        })
      });

      const putData = await putRes.json();

      if (!putRes.ok) {
        throw new Error(putData.message || 'Failed to upload to GitHub');
      }

      return new Response(JSON.stringify({ 
        success: true, 
        url: relativePath,
        message: 'Image uploaded successfully to GitHub!' 
      }), { status: 200 });

    } else {
      // Local Mode: Save to local filesystem using dynamic dynamic imports
      // This prevents Cloudflare Worker loaders from crashing on native Node modules in production
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      
      // Ensure the directory exists
      await fs.mkdir(uploadDir, { recursive: true });
      
      const filePath = path.join(uploadDir, cleanFilename);
      
      // Edge-safe base64 string decoding to binary
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      await fs.writeFile(filePath, bytes);

      return new Response(JSON.stringify({ 
        success: true, 
        url: relativePath,
        message: 'Image saved locally!' 
      }), { status: 200 });
    }

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to upload image', 
      details: error.message 
    }), { status: 500 });
  }
};
