import { useState, useEffect } from 'react';
import ImageUploader from './ImageUploader';

export default function RecipeGenerator() {
  const [recipe, setRecipe] = useState({
    title: '',
    description: '',
    heroImage: '/hero-bg.png',
    baseServings: 4,
    prepTime: 15,
    cookTime: 30,
    difficulty: 'easy',
    cuisine: '',
    mealType: 'dinner',
    cookingMethod: 'stovetop',
    dietaryTags: '',
    rating: 5,
    ingredients: [{ name: '', quantity: 1, unit: '', notes: '' }],
    steps: [''],
    nutrition: { calories: '', protein: '', carbs: '', fat: '' }
  });

  const [availableAssets, setAvailableAssets] = useState([]);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Fetch all uploaded assets from Media Library
    fetch('/api/get-uploads', {
      headers: {
        'x-github-token': localStorage.getItem('admin_github_token') || '',
        'x-github-owner': localStorage.getItem('admin_github_owner') || '',
        'x-github-repo': localStorage.getItem('admin_github_repo') || ''
      }
    })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.files) {
          setAvailableAssets(res.files);
        }
      })
      .catch(err => console.error('Failed to load uploads:', err));

    const params = new URLSearchParams(window.location.search);
    const editSlug = params.get('edit');
    if (editSlug) {
      setIsEditing(true);
      fetch(`/api/get-content?collection=recipes&id=${editSlug}`, {
        headers: {
          'x-github-token': localStorage.getItem('admin_github_token') || '',
          'x-github-owner': localStorage.getItem('admin_github_owner') || '',
          'x-github-repo': localStorage.getItem('admin_github_repo') || ''
        }
      })
        .then(res => res.json())
        .then(res => {
          if (res.success && res.data) {
            const data = res.data;
            setRecipe({
              title: data.title || '',
              description: data.description || '',
              heroImage: data.heroImage || '/hero-bg.png',
              baseServings: data.baseServings || 4,
              prepTime: data.prepTime || 15,
              cookTime: data.cookTime || 30,
              difficulty: data.difficulty || 'easy',
              cuisine: data.cuisine || '',
              mealType: data.mealType || 'dinner',
              cookingMethod: data.cookingMethod || 'stovetop',
              dietaryTags: Array.isArray(data.dietaryTags) ? data.dietaryTags.join(', ') : '',
              rating: data.rating || 5,
              ingredients: data.ingredients && data.ingredients.length > 0 ? data.ingredients : [{ name: '', quantity: 1, unit: '', notes: '' }],
              steps: data.steps && data.steps.length > 0 ? data.steps : [''],
              nutrition: {
                calories: data.nutrition?.calories || '',
                protein: data.nutrition?.protein || '',
                carbs: data.nutrition?.carbs || '',
                fat: data.nutrition?.fat || ''
              }
            });
          }
        })
        .catch(err => console.error('Failed to load recipe for editing:', err));
    }
  }, []);

  const [generatedMd, setGeneratedMd] = useState('');

  const updateField = (field, value) => {
    setRecipe(prev => ({ ...prev, [field]: value }));
  };

  const updateNutrition = (field, value) => {
    setRecipe(prev => ({
      ...prev,
      nutrition: { ...prev.nutrition, [field]: value }
    }));
  };

  const updateIngredient = (index, field, value) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index][field] = value;
    setRecipe(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const addIngredient = () => {
    setRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantity: 1, unit: '', notes: '' }]
    }));
  };

  const removeIngredient = (index) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const updateStep = (index, value) => {
    const newSteps = [...recipe.steps];
    newSteps[index] = value;
    setRecipe(prev => ({ ...prev, steps: newSteps }));
  };

  const addStep = () => {
    setRecipe(prev => ({ ...prev, steps: [...prev.steps, ''] }));
  };

  const removeStep = (index) => {
    if (recipe.steps.length > 1) {
      setRecipe(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
    }
  };

  const [saveStatus, setSaveStatus] = useState(null);

  const generateAndSave = async () => {
    const tags = recipe.dietaryTags.split(',').map(t => t.trim()).filter(Boolean);
    
    const frontmatter = [
      '---',
      `title: "${recipe.title.replace(/"/g, '\\"')}"`,
      `description: "${recipe.description.replace(/"/g, '\\"')}"`,
      `heroImage: "${recipe.heroImage}"`,
      `baseServings: ${recipe.baseServings}`,
      `prepTime: ${recipe.prepTime}`,
      `cookTime: ${recipe.cookTime}`,
      `difficulty: "${recipe.difficulty}"`,
      `cuisine: "${recipe.cuisine}"`,
      `mealType: "${recipe.mealType}"`,
      `cookingMethod: "${recipe.cookingMethod}"`,
      `dietaryTags: ${JSON.stringify(tags)}`,
      `rating: ${recipe.rating}`,
      ...(recipe.nutrition.calories ? [
        'nutrition:',
        `  calories: ${recipe.nutrition.calories}`,
        `  protein: ${recipe.nutrition.protein}`,
        `  carbs: ${recipe.nutrition.carbs}`,
        `  fat: ${recipe.nutrition.fat}`
      ] : []),
      'ingredients:',
      ...recipe.ingredients.map(ing => 
        `  - { name: "${ing.name}", quantity: ${ing.quantity}, unit: "${ing.unit}", notes: "${ing.notes}" }`
      ),
      '---',
      '',
      ...recipe.steps.map((step, i) => `${i + 1}. ${step}`),
    ].join('\n');

    setGeneratedMd(frontmatter);
    setSaveStatus('saving');

    try {
      const filename = `${recipe.title.toLowerCase().replace(/\s+/g, '-') || 'recipe'}.md`;
      const response = await fetch('/api/save-content', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-github-token': localStorage.getItem('admin_github_token') || '',
          'x-github-owner': localStorage.getItem('admin_github_owner') || '',
          'x-github-repo': localStorage.getItem('admin_github_repo') || ''
        },
        body: JSON.stringify({ filename, content: frontmatter, collection: 'recipes' })
      });

      const result = await response.json();

      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => {
          setSaveStatus(null);
          // Redirect to the hidden admin panel or standard recipes page
          // If we edited an item, going back to admin panel is best. Otherwise standard page.
          const params = new URLSearchParams(window.location.search);
          const isFromAdmin = params.get('admin') === 'true' || params.get('edit');
          window.location.href = isFromAdmin ? '/admin' : '/recipes';
        }, 100); // 100ms instant redirect to beat Astro's dev server HMR rebuild reload
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      
      // Fallback to download if API fails
      const element = document.createElement("a");
      const file = new Blob([frontmatter], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${recipe.title.toLowerCase().replace(/\s+/g, '-') || 'recipe'}.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMd);
    alert('Markdown copied to clipboard!');
  };

  const downloadFile = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedMd], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${recipe.title.toLowerCase().replace(/\s+/g, '-') || 'recipe'}.md`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-12 items-start">
      {/* Form */}
      <div className="space-y-10 bg-base-200/30 p-8 md:p-12 border border-base-300">
        <section className="space-y-6">
          <h2 className="text-2xl font-bold font-serif uppercase tracking-widest border-b border-base-300 pb-4">Basic Info</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Recipe Title</label>
              <input 
                type="text" value={recipe.title} onChange={e => updateField('title', e.target.value)}
                className="input" placeholder="e.g. Grandma's Secret Pasta"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Hero Image</label>
              <ImageUploader 
                imageUrl={recipe.heroImage} 
                onUploadSuccess={url => {
                  updateField('heroImage', url);
                  if (!availableAssets.includes(url)) {
                    setAvailableAssets(prev => [url, ...prev]);
                  }
                }} 
              />
              {availableAssets.length > 0 && (
                <div className="pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowAssetPicker(!showAssetPicker)}
                    className="text-[9px] uppercase tracking-wider font-bold text-primary hover:underline focus:outline-none"
                  >
                    {showAssetPicker ? 'Hide Library' : 'Or Choose from Library'}
                  </button>
                  {showAssetPicker && (
                    <div className="grid grid-cols-4 gap-2 mt-3 p-3 bg-base-200 border border-base-300 max-h-40 overflow-y-auto">
                      {availableAssets.map(url => {
                        const isSelected = recipe.heroImage === url;
                        return (
                          <button
                            key={url}
                            type="button"
                            onClick={() => {
                              updateField('heroImage', url);
                              setShowAssetPicker(false);
                            }}
                            className={`aspect-square relative border overflow-hidden hover:border-primary transition-colors ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-base-300'}`}
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Description</label>
            <textarea 
              value={recipe.description} onChange={e => updateField('description', e.target.value)}
              className="input h-24 resize-none" placeholder="A short, evocative teaser..."
            />
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold font-serif uppercase tracking-widest border-b border-base-300 pb-4">Metadata</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Servings</label>
              <input type="number" value={recipe.baseServings} onChange={e => updateField('baseServings', Number(e.target.value))} className="input" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Prep (min)</label>
              <input type="number" value={recipe.prepTime} onChange={e => updateField('prepTime', Number(e.target.value))} className="input" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Cook (min)</label>
              <input type="number" value={recipe.cookTime} onChange={e => updateField('cookTime', Number(e.target.value))} className="input" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Rating (0-5)</label>
              <input type="number" step="0.5" min="0" max="5" value={recipe.rating} onChange={e => updateField('rating', Number(e.target.value))} className="input" />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Cuisine</label>
              <input type="text" value={recipe.cuisine} onChange={e => updateField('cuisine', e.target.value)} className="input" placeholder="e.g. Italian" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Meal Type</label>
              <select value={recipe.mealType} onChange={e => updateField('mealType', e.target.value)} className="input">
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="dessert">Dessert</option>
                <option value="snack">Snack</option>
              </select>
            </div>
             <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Method</label>
              <select value={recipe.cookingMethod} onChange={e => updateField('cookingMethod', e.target.value)} className="input">
                <option value="stovetop">Stovetop</option>
                <option value="oven">Oven</option>
                <option value="slow-cooker">Slow Cooker</option>
                <option value="one-pan">One Pan</option>
                <option value="no-bake">No Bake</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Dietary Tags (comma separated)</label>
            <input type="text" value={recipe.dietaryTags} onChange={e => updateField('dietaryTags', e.target.value)} className="input" placeholder="vegan, gluten-free" />
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold font-serif uppercase tracking-widest border-b border-base-300 pb-4">Nutrition per serving (Optional)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Calories</label>
              <input type="number" value={recipe.nutrition.calories} onChange={e => updateNutrition('calories', e.target.value)} className="input" placeholder="e.g. 450" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Protein (g)</label>
              <input type="number" value={recipe.nutrition.protein} onChange={e => updateNutrition('protein', e.target.value)} className="input" placeholder="e.g. 24" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Carbs (g)</label>
              <input type="number" value={recipe.nutrition.carbs} onChange={e => updateNutrition('carbs', e.target.value)} className="input" placeholder="e.g. 52" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Fat (g)</label>
              <input type="number" value={recipe.nutrition.fat} onChange={e => updateNutrition('fat', e.target.value)} className="input" placeholder="e.g. 18" />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex justify-between items-center border-b border-base-300 pb-4">
            <h2 className="text-2xl font-bold font-serif uppercase tracking-widest">Ingredients</h2>
            <button onClick={addIngredient} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">+ Add Ingredient</button>
          </div>
          <div className="space-y-4">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_2fr_auto] gap-4 items-end animate-entrance">
                <div className="space-y-1">
                   <label className="text-[8px] font-bold uppercase opacity-30">Qty</label>
                   <input type="number" step="0.1" value={ing.quantity} onChange={e => updateIngredient(i, 'quantity', Number(e.target.value))} className="input px-2" />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-bold uppercase opacity-30">Unit</label>
                   <select 
                    value={ing.unit} 
                    onChange={e => updateIngredient(i, 'unit', e.target.value)} 
                    className="input px-3"
                   >
                     <option value="">(None)</option>
                     <option value="g">g</option>
                     <option value="kg">kg</option>
                     <option value="ml">ml</option>
                     <option value="l">l</option>
                     <option value="cup">cup</option>
                     <option value="tbsp">tbsp</option>
                     <option value="tsp">tsp</option>
                     <option value="oz">oz</option>
                     <option value="lb">lb</option>
                     <option value="piece">piece</option>
                     <option value="clove">clove</option>
                     <option value="sprig">sprig</option>
                     <option value="bunch">bunch</option>
                     <option value="pinch">pinch</option>
                     <option value="whole">whole</option>
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-bold uppercase opacity-30">Name</label>
                   <input type="text" value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} className="input px-3" placeholder="Olive Oil" />
                </div>
                <button onClick={() => removeIngredient(i)} className="p-3 text-base-content/30 hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" className="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex justify-between items-center border-b border-base-300 pb-4">
            <h2 className="text-2xl font-bold font-serif uppercase tracking-widest">Method</h2>
            <button onClick={addStep} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">+ Add Step</button>
          </div>
          <div className="space-y-6">
            {recipe.steps.map((step, i) => (
              <div key={i} className="flex gap-6 items-start animate-entrance">
                <div className="flex-none w-8 h-8 bg-base-300 flex items-center justify-center font-bold text-[10px] tabular-nums mt-2">
                  {i + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <textarea 
                    value={step} onChange={e => updateStep(i, e.target.value)}
                    className="input min-h-[80px] py-3 text-sm leading-relaxed" 
                    placeholder={`Step ${i + 1} instructions...`}
                  />
                </div>
                <button 
                  onClick={() => removeStep(i)} 
                  className={`mt-4 p-2 text-base-content/20 hover:text-primary transition-colors ${recipe.steps.length === 1 ? 'invisible' : ''}`}
                  title="Remove step"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" className="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>

        <button 
          onClick={generateAndSave}
          disabled={saveStatus === 'saving'}
          className={`w-full btn py-6 text-sm flex items-center justify-center gap-3 ${
            saveStatus === 'success' ? 'bg-green-600 border-green-600 text-white' : 
            saveStatus === 'error' ? 'bg-red-600 border-red-600 text-white' : 
            'btn-primary'
          }`}
        >
          {saveStatus === 'saving' ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : saveStatus === 'success' ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" className="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Saved to Collection
            </>
          ) : saveStatus === 'error' ? (
             'Error Saving (Downloaded instead)'
          ) : (
            'Generate & Save Recipe'
          )}
        </button>
      </div>

      {/* Output / Preview */}
      <div className="lg:sticky lg:top-24 space-y-8">
        {generatedMd ? (
          <div className="space-y-6 animate-entrance">
            <div className="flex justify-between items-center border-b border-base-300 pb-4">
              <h2 className="text-2xl font-bold font-serif uppercase tracking-widest">Generated Markdown</h2>
              <div className="flex gap-4">
                <button onClick={copyToClipboard} className="text-[10px] font-bold uppercase tracking-widest hover:text-primary transition-colors">Copy</button>
                <button onClick={downloadFile} className="text-[10px] font-bold uppercase tracking-widest hover:text-primary transition-colors">Download</button>
              </div>
            </div>
            <pre className="bg-base-200 p-8 border border-base-300 overflow-x-auto text-xs leading-relaxed font-mono whitespace-pre-wrap">
              {generatedMd}
            </pre>
            <div className="p-6 bg-primary/5 border border-primary/20">
               <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-2">Success</p>
               <p className="text-sm font-serif italic opacity-70">
                 Your recipe has been saved to <code className="bg-base-300 px-1 font-sans not-italic">src/content/recipes/</code>. It will appear on the site once the build process completes.
               </p>
            </div>
          </div>
        ) : (
          <div className="h-[600px] border-2 border-dashed border-base-300 flex flex-col items-center justify-center text-center p-12">
            <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mb-6">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-8 h-8 opacity-20">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold font-serif uppercase tracking-widest mb-4 opacity-30">Recipe Preview</h3>
            <p className="text-sm font-serif italic opacity-40 max-w-xs">
              Fill out the form and generate the markdown to preview your recipe file here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
