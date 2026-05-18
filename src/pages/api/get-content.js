export const prerender = false;

// Simple but robust frontmatter + markdown parser
function parseMarkdownContent(markdown) {
  const parts = markdown.split('---');
  if (parts.length < 3) {
    return { title: '', content: markdown, body: markdown };
  }
  const frontmatterStr = parts[1];
  const body = parts.slice(2).join('---').trim();

  const lines = frontmatterStr.split('\n');
  const data = {
    title: '',
    description: '',
    baseServings: 4,
    prepTime: 0,
    cookTime: 0,
    difficulty: 'easy',
    cuisine: '',
    mealType: '',
    cookingMethod: '',
    dietaryTags: [],
    featured: false,
    rating: 5,
    heroImage: '',
    ingredients: [],
    nutrition: { calories: '', protein: '', carbs: '', fat: '' }
  };

  let currentKey = null;
  let currentIngredient = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Nested array items
    if (trimmed.startsWith('-')) {
      if (currentKey === 'dietaryTags') {
        const val = trimmed.replace(/^-\s*/, '').replace(/"/g, '').trim();
        data.dietaryTags.push(val);
      } else if (currentKey === 'ingredients') {
        // Parse ingredients (could be inline JSON-like syntax: - { name: "...", quantity: ... })
        if (trimmed.includes('{')) {
          try {
            // Clean inline yaml dict into JSON
            const jsonLikeStr = trimmed.replace(/^-\s*/, '')
              .replace(/(\w+):/g, '"$1":')
              .replace(/'/g, '"');
            const ing = JSON.parse(jsonLikeStr);
            data.ingredients.push({
              name: ing.name || '',
              quantity: ing.quantity || 0,
              unit: ing.unit || '',
              notes: ing.notes || ''
            });
          } catch (e) {
            console.error('Failed to parse inline ingredient:', trimmed, e);
          }
        } else {
          // Multiline ingredient format
          if (currentIngredient) {
            data.ingredients.push(currentIngredient);
          }
          currentIngredient = { name: '', quantity: 0, unit: '', notes: '' };
          const rest = trimmed.replace(/^-\s*/, '');
          const match = rest.match(/^(\w+):\s*(.*)$/);
          if (match) {
            const [, k, v] = match;
            const cleanedVal = v.replace(/^"|"$/g, '').trim();
            if (k === 'name') currentIngredient.name = cleanedVal;
            if (k === 'quantity') currentIngredient.quantity = parseFloat(cleanedVal) || 0;
            if (k === 'unit') currentIngredient.unit = cleanedVal;
            if (k === 'notes') currentIngredient.notes = cleanedVal;
          }
        }
      }
      continue;
    }

    // Nested list item updates (for multiline ingredients)
    if (!trimmed.startsWith('-') && currentKey === 'ingredients' && currentIngredient) {
      const match = trimmed.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, k, v] = match;
        const cleanedVal = v.replace(/^"|"$/g, '').trim();
        if (k === 'name') currentIngredient.name = cleanedVal;
        else if (k === 'quantity') currentIngredient.quantity = parseFloat(cleanedVal) || 0;
        else if (k === 'unit') currentIngredient.unit = cleanedVal;
        else if (k === 'notes') currentIngredient.notes = cleanedVal;
        continue;
      }
    }

    // Parse top-level key-value
    const match = trimmed.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, val] = match;
      const cleanedVal = val.replace(/^"|"$/g, '').trim();

      // Handle entering nested sections
      if (key === 'ingredients' || key === 'dietaryTags' || key === 'nutrition') {
        if (key === 'dietaryTags' && cleanedVal.startsWith('[') && cleanedVal.endsWith(']')) {
          try {
            // Replace single quotes with double quotes for JSON parsing if any
            data.dietaryTags = JSON.parse(cleanedVal.replace(/'/g, '"'));
          } catch (e) {
            console.error('Failed to parse inline dietaryTags:', cleanedVal, e);
          }
        } else {
          currentKey = key;
          if (currentKey === 'ingredients' && currentIngredient) {
            data.ingredients.push(currentIngredient);
            currentIngredient = null;
          }
        }
        continue;
      }

      // Indented values inside nested keys
      const hasLeadingSpaces = line.startsWith('  ') || line.startsWith('\t');
      if (hasLeadingSpaces && currentKey === 'nutrition') {
        if (key === 'calories') data.nutrition.calories = cleanedVal;
        if (key === 'protein') data.nutrition.protein = cleanedVal;
        if (key === 'carbs') data.nutrition.carbs = cleanedVal;
        if (key === 'fat') data.nutrition.fat = cleanedVal;
        continue;
      }

      currentKey = null; // Exit nested keys

      if (key === 'title') data.title = cleanedVal;
      else if (key === 'description') data.description = cleanedVal;
      else if (key === 'baseServings') data.baseServings = parseInt(cleanedVal) || 4;
      else if (key === 'prepTime') data.prepTime = parseInt(cleanedVal) || 0;
      else if (key === 'cookTime') data.cookTime = parseInt(cleanedVal) || 0;
      else if (key === 'difficulty') data.difficulty = cleanedVal;
      else if (key === 'cuisine') data.cuisine = cleanedVal;
      else if (key === 'mealType') data.mealType = cleanedVal;
      else if (key === 'cookingMethod') data.cookingMethod = cleanedVal;
      else if (key === 'featured') data.featured = cleanedVal === 'true';
      else if (key === 'rating') data.rating = parseFloat(cleanedVal) || 5;
      else if (key === 'heroImage') data.heroImage = cleanedVal;
      else if (key === 'pubDate') data.pubDate = cleanedVal;
    }
  }

  // Add the last ingredient if exists
  if (currentIngredient) {
    data.ingredients.push(currentIngredient);
  }

  // Parse list of steps from recipe body
  const steps = [];
  const methodPart = /Method/i.test(body) ? (body.split(/##?\s*Method/i)[1] || '') : body;
  if (methodPart) {
    const stepLines = methodPart.split('\n');
    for (let line of stepLines) {
      const match = line.trim().match(/^\d+\.\s*(.*)$/);
      if (match) {
        steps.push(match[1].trim());
      }
    }
  }

  return { ...data, body, steps };
}

export const GET = async (context) => {
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

    let markdownContent = '';

    if (!isDev && token && owner && repo) {
      // Production: Fetch file from GitHub
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      
      const res = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Chefs-Hand-App',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'File not found on GitHub' }), { status: 404 });
      }

      const data = await res.json();
      // Decode base64 UTF-8 safely
      markdownContent = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));

    } else {
      // Local development: Read from local filesystem using dynamic dynamic imports
      // This prevents Cloudflare Worker loaders from crashing on native Node modules in production
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      const localFilePath = path.join(process.cwd(), 'src', 'content', collection, `${safeId}.md`);
      try {
        markdownContent = await fs.readFile(localFilePath, 'utf8');
      } catch (err) {
        return new Response(JSON.stringify({ error: `File not found locally: ${localFilePath}` }), { status: 404 });
      }
    }

    const parsedData = parseMarkdownContent(markdownContent);

    return new Response(JSON.stringify({
      success: true,
      data: parsedData
    }), { status: 200 });

  } catch (error) {
    console.error('Error fetching content:', error);
    return new Response(JSON.stringify({
      error: 'Failed to retrieve content',
      details: error.message
    }), { status: 500 });
  }
};
