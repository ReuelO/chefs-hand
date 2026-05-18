import { useState } from 'react';

export default function ImageUploader({ imageUrl, onUploadSuccess }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (png, jpg, jpeg, webp)');
      return;
    }

    // Validate size (limit to 4MB for serverless/GitHub payload limits)
    if (file.size > 4 * 1024 * 1024) {
      setError('Image is too large. Max size is 4MB.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Convert to Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];
        
        const response = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, base64Data })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          onUploadSuccess(data.url);
        } else {
          throw new Error(data.error || 'Failed to upload image');
        }
        setIsUploading(false);
      };
      reader.onerror = () => {
        throw new Error('Failed to read file');
      };

    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong during upload.');
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        {imageUrl ? (
          <div className="w-16 h-16 bg-base-200 border border-base-300 overflow-hidden relative group">
            <img src={imageUrl} alt="Hero Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-[8px] font-bold text-white uppercase tracking-wider">Active</span>
            </div>
          </div>
        ) : (
          <div className="w-16 h-16 bg-base-200 border border-dashed border-base-300 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 opacity-30">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375 0 1 1-.75 0 .375 0 0 1 .75 0Z" />
            </svg>
          </div>
        )}

        <div className="flex-1">
          <label className="relative inline-block bg-base-content text-base-100 font-bold uppercase tracking-widest text-[10px] px-6 py-3.5 hover:bg-base-content/90 transition-colors cursor-pointer text-center">
            {isUploading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3 w-3 text-base-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </span>
            ) : 'Upload Image'}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            />
          </label>
          <p className="text-[9px] text-base-content/40 mt-2">Max size: 4MB (PNG, JPG, WebP)</p>
        </div>
      </div>

      {error && (
        <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider">{error}</p>
      )}
    </div>
  );
}
