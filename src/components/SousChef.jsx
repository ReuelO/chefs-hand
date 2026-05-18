import { useState } from 'react';

const CONVERSIONS = {
  temp: {
    label: 'Temperature',
    from: 'C',
    to: 'F',
    calc: (val) => (val * 9/5) + 32,
  },
  weight: {
    label: 'Weight',
    from: 'oz',
    to: 'g',
    calc: (val) => val * 28.35,
  },
  volume: {
    label: 'Volume',
    from: 'cup',
    to: 'ml',
    calc: (val) => val * 236.58,
  }
};

const KITCHEN_TIPS = [
  "Sharp knives are safer than dull ones.",
  "Mise en place: get everything ready before you start.",
  "Salt as you go, not just at the end.",
  "Taste everything. Adjust the acid (lemon/vinegar) if it's flat.",
  "Let meat rest for at least 5-10 minutes after cooking.",
  "Clean as you go to avoid a mountain of dishes.",
  "Acid (lemon/vinegar) brightens heavy dishes."
];

export default function SousChef() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('convert');
  const [convType, setConvType] = useState('temp');
  const [inputValue, setInputValue] = useState('');
  const [tipIndex, setTipIndex] = useState(0);

  const currentConv = CONVERSIONS[convType];
  const result = inputValue ? currentConv.calc(Number(inputValue)).toFixed(1) : '—';

  const nextTip = () => setTipIndex((tipIndex + 1) % KITCHEN_TIPS.length);

  return (
    <div className="utility-panel no-print">
      {isOpen && (
        <div className="utility-card">
          <div className="flex border-b border-base-300 mb-6">
            <button 
              onClick={() => setActiveTab('convert')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'convert' ? 'text-primary border-b-2 border-primary' : 'opacity-40'}`}
            >
              Convert
            </button>
            <button 
              onClick={() => setActiveTab('tips')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'tips' ? 'text-primary border-b-2 border-primary' : 'opacity-40'}`}
            >
              Tips
            </button>
          </div>

          {activeTab === 'convert' ? (
            <div className="space-y-6">
              <div className="flex gap-2">
                {Object.keys(CONVERSIONS).map(type => (
                  <button 
                    key={type}
                    onClick={() => setConvType(type)}
                    className={`flex-1 py-1 text-[8px] font-bold uppercase border transition-colors ${convType === type ? 'bg-base-content text-base-100 border-base-content' : 'border-base-300'}`}
                  >
                    {CONVERSIONS[type].label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-[8px] font-bold uppercase opacity-30">{currentConv.from}</label>
                  <input 
                    type="number" 
                    value={inputValue} 
                    onChange={(e) => setInputValue(e.target.value)}
                    className="input py-2 text-sm"
                    placeholder="Value..."
                  />
                </div>
                <div className="pt-4 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" className="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 4.5 7.5 7.5-7.5 7.5M3 12h16.5" />
                  </svg>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[8px] font-bold uppercase opacity-30">{currentConv.to}</label>
                  <div className="input py-2 text-sm bg-base-200 border-dashed flex items-center">{result}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm font-serif italic leading-relaxed text-base-content/70 min-h-[60px]">
                "{KITCHEN_TIPS[tipIndex]}"
              </p>
              <button 
                onClick={nextTip}
                className="w-full py-2 text-[10px] font-bold uppercase tracking-widest border border-base-300 hover:bg-base-200 transition-colors"
              >
                Next Tip
              </button>
            </div>
          )}
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="utility-button"
        aria-label="Sous Chef Tools"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" className="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" className="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
