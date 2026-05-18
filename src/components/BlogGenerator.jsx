import { useState, useEffect } from 'react';
import ImageUploader from './ImageUploader';

// Simple markdown parser for preview
const parseMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n$/gim, '<br />')
    .split('\n').map(line => {
      if (line.trim() && !line.startsWith('<')) {
        return `<p>${line}</p>`;
      }
      return line;
    }).join('\n');
};

export default function BlogGenerator() {
  const [post, setPost] = useState({
    title: '',
    description: '',
    heroImage: '/blog-placeholder-1.jpg',
    pubDate: new Date().toISOString().split('T')[0],
    content: ''
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editSlug = params.get('edit');
    if (editSlug) {
      setIsEditing(true);
      fetch(`/api/get-content?collection=blog&id=${editSlug}`)
        .then(res => res.json())
        .then(res => {
          if (res.success && res.data) {
            const data = res.data;
            setPost({
              title: data.title || '',
              description: data.description || '',
              heroImage: data.heroImage || '/blog-placeholder-1.jpg',
              pubDate: data.pubDate || new Date().toISOString().split('T')[0],
              content: data.body || ''
            });
          }
        })
        .catch(err => console.error('Failed to load blog post for editing:', err));
    }
  }, []);

  const [generatedMd, setGeneratedMd] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);

  const updateField = (field, value) => {
    setPost(prev => ({ ...prev, [field]: value }));
  };

  const generateAndSave = async () => {
    const frontmatter = [
      '---',
      `title: "${post.title.replace(/"/g, '\\"')}"`,
      `description: "${post.description.replace(/"/g, '\\"')}"`,
      `pubDate: "${post.pubDate}"`,
      `heroImage: "${post.heroImage}"`,
      '---',
      '',
      post.content
    ].join('\n');

    setGeneratedMd(frontmatter);
    setSaveStatus('saving');

    try {
      const filename = `${post.title.toLowerCase().replace(/\s+/g, '-') || 'post'}.md`;
      const response = await fetch('/api/save-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content: frontmatter, collection: 'blog' })
      });

      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => {
          setSaveStatus(null);
          const params = new URLSearchParams(window.location.search);
          const isFromAdmin = params.get('admin') === 'true' || params.get('edit');
          window.location.href = isFromAdmin ? '/admin' : '/blog';
        }, 100); // 100ms instant redirect to beat Astro dev server HMR rebuild
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      setSaveStatus('error');
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
      {/* Form */}
      <div className="space-y-10 bg-base-200/30 p-8 md:p-12 border border-base-300">
        <section className="space-y-6">
          <h2 className="text-2xl font-bold font-serif uppercase tracking-widest border-b border-base-300 pb-4">Story Details</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Title</label>
              <input 
                type="text" value={post.title} onChange={e => updateField('title', e.target.value)}
                className="input text-2xl font-serif" placeholder="The Art of Sourdough..."
              />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
               <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Publish Date</label>
                <input 
                  type="date" value={post.pubDate} onChange={e => updateField('pubDate', e.target.value)}
                  className="input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Hero Image</label>
                <ImageUploader 
                  imageUrl={post.heroImage} 
                  onUploadSuccess={url => updateField('heroImage', url)} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Description</label>
              <textarea 
                value={post.description} onChange={e => updateField('description', e.target.value)}
                className="input h-24 resize-none italic font-serif" placeholder="A compelling lead sentence..."
              />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold font-serif uppercase tracking-widest border-b border-base-300 pb-4">Content</h2>
          <div className="space-y-2">
            <textarea 
              value={post.content} onChange={e => updateField('content', e.target.value)}
              className="input h-[400px] font-mono text-sm leading-relaxed" 
              placeholder="Write your story here... (Markdown supported)"
            />
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
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Story Saved' : 'Publish Story'}
        </button>
      </div>

      {/* Live Preview */}
      <div className="lg:sticky lg:top-24 space-y-8">
        <div className="border border-base-300 bg-base-100 min-h-[800px] flex flex-col">
          <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-200/50">
             <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40">Live Editorial Preview</span>
             <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-base-300"></div>
                <div className="w-2 h-2 rounded-full bg-base-300"></div>
                <div className="w-2 h-2 rounded-full bg-base-300"></div>
             </div>
          </div>
          
          <div className="flex-1 p-8 md:p-12 overflow-y-auto max-h-[90vh]">
            <article className="max-w-2xl mx-auto space-y-12">
               <header className="text-center space-y-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">
                    {new Date(post.pubDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <h1 className="text-4xl md:text-5xl font-bold font-serif leading-tight tracking-tight">
                    {post.title || 'Your Story Title'}
                  </h1>
                  <p className="text-xl text-base-content/60 font-serif italic max-w-lg mx-auto leading-relaxed">
                    {post.description || 'Your compelling description will appear here.'}
                  </p>
               </header>

               {post.heroImage && (
                 <div className="aspect-video bg-base-200 border border-base-300 overflow-hidden">
                    <img src={post.heroImage} alt="" className="w-full h-full object-cover opacity-80" />
                 </div>
               )}

               <div className="prose prose-lg font-serif italic leading-relaxed text-base-content/80 border-t border-base-300 pt-12" 
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(post.content) || '<p class="opacity-30">Start typing to see the magic...</p>' }}>
               </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
