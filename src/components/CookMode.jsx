import React, { useEffect, useState } from 'react';

export default function CookMode({ title, ingredients, baseServings, totalTime, children }) {
  // Session Preservation Helper
  const getSessionValue = (key, defaultValue) => {
    try {
      const val = sessionStorage.getItem(`cook_${title}_${key}`);
      return val !== null ? JSON.parse(val) : defaultValue;
    } catch (err) {
      console.warn('Failed to read sessionStorage:', err);
      return defaultValue;
    }
  };

  const [isOpen, setIsOpen] = useState(() => getSessionValue('isOpen', false));
  const [showIngredients, setShowIngredients] = useState(() => getSessionValue('showIngredients', true));
  const [completedSteps, setCompletedSteps] = useState(() => getSessionValue('completedSteps', []));
  const [totalSteps, setTotalSteps] = useState(0);
  const [fontScale, setFontScale] = useState(() => getSessionValue('fontScale', 1.25));
  const [servings, setServings] = useState(() => getSessionValue('servings', baseServings));

  // Timer and Countdown state
  const [time, setTime] = useState(() => getSessionValue('time', 0));
  const [isTimerRunning, setIsTimerRunning] = useState(() => getSessionValue('isTimerRunning', false));
  const [activeCountdown, setActiveCountdown] = useState(null);

  // Synchronize state updates to sessionStorage for full crash preservation
  useEffect(() => {
    sessionStorage.setItem(`cook_${title}_isOpen`, JSON.stringify(isOpen));
  }, [isOpen, title]);

  useEffect(() => {
    sessionStorage.setItem(`cook_${title}_showIngredients`, JSON.stringify(showIngredients));
  }, [showIngredients, title]);

  useEffect(() => {
    sessionStorage.setItem(`cook_${title}_completedSteps`, JSON.stringify(completedSteps));
  }, [completedSteps, title]);

  useEffect(() => {
    sessionStorage.setItem(`cook_${title}_fontScale`, JSON.stringify(fontScale));
  }, [fontScale, title]);

  useEffect(() => {
    sessionStorage.setItem(`cook_${title}_servings`, JSON.stringify(servings));
  }, [servings, title]);

  useEffect(() => {
    sessionStorage.setItem(`cook_${title}_time`, JSON.stringify(time));
  }, [time, title]);

  useEffect(() => {
    sessionStorage.setItem(`cook_${title}_isTimerRunning`, JSON.stringify(isTimerRunning));
  }, [isTimerRunning, title]);

  const startCountdownRef = React.useRef(null);
  useEffect(() => {
    startCountdownRef.current = (seconds, label) => {
      setActiveCountdown({ seconds, label });
    };
  }, []);

  // Toggle body scroll and initialize Screen Wake Lock when open
  useEffect(() => {
    let wakeLock = null;
    
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Screen Wake Lock request failed:', err.message);
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      requestWakeLock();

      // Calculate total steps with a slight delay to ensure content is rendered
      const timer = setTimeout(() => {
        const steps = document.querySelectorAll('.cook-content li');
        setTotalSteps(steps.length);
        
        // Parse individual step durations from text
        steps.forEach((step, index) => {
          const text = step.textContent;
          const durationMatch = text.match(/(\d+)\s*(minutes|min|hour|hr|h|m)\b/i);
          if (durationMatch && !step.querySelector('.step-duration')) {
            const badge = document.createElement('button');
            badge.className = 'step-duration ml-3 inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-primary text-white hover:bg-primary-dark transition-colors align-middle shadow-sm cursor-pointer z-10 relative';
            badge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 mr-1"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clip-rule="evenodd" /></svg>Start ${durationMatch[0]}`;
            
            let seconds = parseInt(durationMatch[1], 10);
            const unit = durationMatch[2].toLowerCase();
            if (['hour', 'hr', 'h'].includes(unit)) seconds *= 3600;
            else if (['minutes', 'min', 'm'].includes(unit)) seconds *= 60;

            badge.onclick = (e) => {
              e.stopPropagation();
              if (startCountdownRef.current) startCountdownRef.current(seconds, `Step ${index + 1}`);
            };
            step.appendChild(badge);
          }
        });

        // Pre-apply visual 'completed' classes to steps loaded from session history
        steps.forEach((step, index) => {
          if (completedSteps.includes(index)) {
            step.classList.add('completed');
          }
        });
      }, 150);
      return () => {
        clearTimeout(timer);
        if (wakeLock) {
          wakeLock.release().then(() => {
            wakeLock = null;
          });
        }
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  useEffect(() => {
    let interval;
    if (activeCountdown && activeCountdown.seconds > 0) {
      interval = setInterval(() => {
        setActiveCountdown(prev => ({ ...prev, seconds: prev.seconds - 1 }));
      }, 1000);
    } else if (activeCountdown && activeCountdown.seconds === 0) {
      alert(`Timer for ${activeCountdown.label} finished!`);
      setActiveCountdown(null);
    }
    return () => clearInterval(interval);
  }, [activeCountdown]);

  const toggleStep = (index) => {
    setCompletedSteps(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };

  // Add click listeners to list items in the content
  useEffect(() => {
    if (isOpen) {
      let cleanupFunctions = [];
      const timer = setTimeout(() => {
        const steps = document.querySelectorAll('.cook-content li');
        steps.forEach((step, index) => {
          step.classList.add('cook-step');
          const handleClick = () => {
            step.classList.toggle('completed');
            toggleStep(index);
          };
          step.addEventListener('click', handleClick);
          cleanupFunctions.push(() => step.removeEventListener('click', handleClick));
        });
      }, 150);

      return () => {
        clearTimeout(timer);
        cleanupFunctions.forEach(cleanup => cleanup());
      };
    }
  }, [isOpen]);

  // Timer logic
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s]
      .map(v => v < 10 ? "0" + v : v)
      .filter((v, i) => v !== "00" || i > 0)
      .join(":");
  };

  const resetMode = () => {
    if (confirm('Reset your progress and timer?')) {
      setTime(0);
      setIsTimerRunning(false);
      setCompletedSteps([]);
      const steps = document.querySelectorAll('.cook-content li');
      steps.forEach(s => s.classList.remove('completed'));
      
      // Explicitly clear preserved data in sessionStorage
      sessionStorage.removeItem(`cook_${title}_completedSteps`);
      sessionStorage.removeItem(`cook_${title}_time`);
      sessionStorage.removeItem(`cook_${title}_isTimerRunning`);
    }
  };

  const scaledIngredients = ingredients.map(ing => ({
    ...ing,
    scaledQuantity: (ing.quantity * servings) / baseServings
  }));

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="inline-block bg-primary text-white font-bold uppercase tracking-widest text-sm px-8 py-4 hover:bg-primary/90 transition-colors mt-8 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" className="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699-2.7c-.91.91-2.167 1.47-3.559 1.47V6.4a6.002 6.002 0 0 1 3.559 1.471" />
          </svg>
          Enter Cook Mode
        </div>
      </button>
    );
  }

  const progressPercentage = totalSteps > 0 ? (completedSteps.length / totalSteps) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-base-100 flex flex-col animate-entrance text-base-content">
      {/* Header */}
      <header className="border-b border-base-300 bg-base-100 sticky top-0 z-10">
        <div className="p-6 flex justify-between items-center">
          <div className="flex flex-col">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Cooking</p>
            <h2 className="text-2xl font-bold font-serif uppercase tracking-widest leading-tight">{title}</h2>
          </div>
          
          <div className="hidden md:flex items-center gap-12">
            {/* Text size controls */}
            <div className="flex flex-col items-center">
              <p className="text-[8px] uppercase tracking-widest text-base-content/40 font-bold mb-1">Text Size</p>
              <div className="flex border border-base-300 overflow-hidden rounded">
                <button 
                  onClick={() => setFontScale(prev => Math.max(0.8, prev - 0.1))}
                  className="px-4 py-1 hover:bg-base-200 transition-colors font-bold border-r border-base-300"
                >
                  –
                </button>
                <button 
                  onClick={() => setFontScale(prev => Math.min(3, prev + 0.1))}
                  className="px-4 py-1 hover:bg-base-200 transition-colors font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <p className="text-[8px] uppercase tracking-widest text-base-content/40 font-bold mb-1">Session / Est.</p>
              <div className="flex items-center gap-3">
                <span className="text-xl font-serif tabular-nums font-bold">{formatTime(time)}</span>
                <span className="text-xs text-base-content/30 font-serif italic">/ {totalTime}m</span>
                <button 
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`p-2 rounded-full border border-base-300 hover:bg-base-200 transition-colors cursor-pointer ${isTimerRunning ? 'text-primary' : 'text-base-content/40'}`}
                >
                  {isTimerRunning ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" className="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" className="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="w-px h-10 bg-base-300"></div>

            <div className="flex flex-col items-end">
              <p className="text-[8px] uppercase tracking-widest text-base-content/40 font-bold mb-1">
                Progress: {completedSteps.length}/{totalSteps || '?'}
              </p>
              <div className="w-40 h-1.5 bg-base-300 overflow-hidden rounded-full">
                 <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${progressPercentage}%` }}
                 ></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowIngredients(!showIngredients)}
              className={`p-3 border border-base-300 transition-colors cursor-pointer ${showIngredients ? 'bg-primary text-white border-primary' : 'hover:bg-base-200'}`}
              title="Toggle Ingredients"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" className="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-3.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </button>
            <button 
              onClick={resetMode}
              className="p-3 border border-base-300 hover:bg-base-200 transition-colors text-base-content/40 hover:text-primary cursor-pointer"
              title="Reset session"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" className="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-3 border border-base-300 hover:bg-base-200 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" className="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile Progress Bar */}
        <div className="md:hidden w-full h-1 bg-base-300 overflow-hidden">
           <div 
            className="h-full bg-primary transition-all duration-500" 
            style={{ width: `${progressPercentage}%` }}
           ></div>
        </div>
      </header>

      {/* Main Content Area with Optional Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Ingredients (Desktop) */}
        {showIngredients && (
          <aside className="hidden lg:block w-96 border-r border-base-300 bg-base-200/30 overflow-y-auto p-10 animate-entrance">
            <div className="flex justify-between items-center mb-8 border-b border-base-300 pb-4">
              <h3 className="text-xl font-bold font-serif uppercase tracking-widest">Ingredients</h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-primary">{servings} Servings</span>
                <input 
                  type="range" min="1" max="24" value={servings} 
                  onChange={(e) => setServings(Number(e.target.value))}
                  className="w-20"
                />
              </div>
            </div>
            <ul className="space-y-4">
              {scaledIngredients.map((ing, i) => (
                <li key={i} className="text-sm font-serif italic border-b border-base-300/50 pb-2">
                  <span className="font-bold font-sans not-italic text-primary">
                    {ing.scaledQuantity % 1 === 0 ? ing.scaledQuantity : ing.scaledQuantity.toFixed(1)} {ing.unit}
                  </span> {ing.name}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[8px] uppercase tracking-widest text-base-content/30 font-bold leading-relaxed">
              * Note: Step durations are estimates based on {baseServings} servings.
            </p>
          </aside>
        )}

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-20 relative">
          <div className="max-w-4xl mx-auto space-y-16">
            <div className="md:hidden bg-base-200/50 p-6 border border-base-300 flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <p className="text-[8px] uppercase tracking-widest text-base-content/40 font-bold mb-1">Timer / Est.</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-serif tabular-nums font-bold">{formatTime(time)}</span>
                    <span className="text-xs text-base-content/30 italic">/ {totalTime}m</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setFontScale(p => Math.max(0.8, p-0.1))} className="w-10 h-10 border border-base-300 flex items-center justify-center font-bold">–</button>
                  <button onClick={() => setFontScale(p => Math.min(3, p+0.1))} className="w-10 h-10 border border-base-300 flex items-center justify-center font-bold">+</button>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-base-300">
                <button 
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="btn btn-primary btn-sm px-8"
                >
                  {isTimerRunning ? 'Pause' : 'Start'}
                </button>
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-bold text-primary">{servings}s</span>
                   <button 
                    onClick={() => setShowIngredients(!showIngredients)}
                    className="btn btn-ghost btn-xs underline underline-offset-4"
                  >
                    {showIngredients ? 'Hide' : 'Ingredients'}
                  </button>
                </div>
              </div>

              {showIngredients && (
                <div className="bg-base-100 p-6 border border-base-300 animate-entrance space-y-6 text-base-content">
                   <div className="flex items-center justify-between border-b border-base-300 pb-3">
                     <span className="text-[10px] font-bold uppercase tracking-widest">Adjust</span>
                     <input 
                        type="range" min="1" max="24" value={servings} 
                        onChange={(e) => setServings(Number(e.target.value))}
                        className="w-1/2"
                      />
                   </div>
                  <ul className="space-y-3">
                    {scaledIngredients.map((ing, i) => (
                      <li key={i} className="text-sm font-serif italic">
                        <span className="font-bold font-sans not-italic">
                          {ing.scaledQuantity % 1 === 0 ? ing.scaledQuantity : ing.scaledQuantity.toFixed(1)} {ing.unit}
                        </span> {ing.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div 
              className="cook-content prose max-w-none prose-neutral lg:prose-xl"
              style={{ fontSize: `${fontScale}rem`, lineHeight: '1.5' }}
            >
               {children}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Countdown */}
      {activeCountdown && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-base-content text-base-100 px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 animate-entrance">
           <svg className="w-5 h-5 animate-pulse text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
           </svg>
           <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-70">{activeCountdown.label} Timer</span>
              <span className="text-xl font-serif font-bold tabular-nums">
                {Math.floor(activeCountdown.seconds / 60)}:{String(activeCountdown.seconds % 60).padStart(2, '0')}
              </span>
           </div>
           <button 
             onClick={() => setActiveCountdown(null)}
             className="ml-4 p-2 bg-base-100/20 hover:bg-base-100/40 rounded-full transition-colors cursor-pointer"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
      )}

      {/* Footer Controls */}
      <footer className="p-4 border-t border-base-300 bg-base-200/50 text-center flex items-center justify-center gap-8">
         <p className="text-[10px] uppercase tracking-widest text-base-content/40 font-bold">
          Keep your device awake. Happy cooking.
         </p>
      </footer>
    </div>
  );
}
