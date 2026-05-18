import fs from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

export const POST = async ({ request }) => {
  try {
    const { filename, content, collection } = await request.json();
    
    if (!filename || !content || !collection) {
      return new Response(JSON.stringify({ error: 'Missing filename, content or collection' }), { status: 400 });
    }

    // Ensure the path is safe and within the project
    const safeFilename = filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
    const filePath = path.join(process.cwd(), 'src', 'content', collection, safeFilename);

    await fs.writeFile(filePath, content, 'utf8');

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Recipe saved successfully to ${filePath}` 
    }), { status: 200 });
    
  } catch (error) {
    console.error('Error saving recipe:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to save recipe', 
      details: error.message 
    }), { status: 500 });
  }
};
