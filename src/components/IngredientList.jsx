import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function IngredientList({ ingredients, baseServings }) {
  const [servings, setServings] = useState(baseServings);
  const [isMetric, setIsMetric] = useState(true);

  const convert = (value, unit, toMetric) => {
    if (!toMetric && unit === 'g') return { value: (value / 28.35).toFixed(1), unit: 'oz' };
    if (!toMetric && unit === 'ml') return { value: (value / 29.574).toFixed(1), unit: 'fl oz' };
    if (toMetric && unit === 'oz') return { value: (value * 28.35).toFixed(0), unit: 'g' };
    if (toMetric && unit === 'fl oz') return { value: (value * 29.574).toFixed(0), unit: 'ml' };
    return { value: value % 1 === 0 ? value : value.toFixed(1), unit };
  };

  const scaledIngredients = useMemo(() => {
    return ingredients.map((ingredient) => {
      const scaledVal = (ingredient.quantity * servings) / baseServings;
      return {
        ...ingredient,
        ...convert(scaledVal, ingredient.unit, isMetric),
      };
    });
  }, [ingredients, servings, baseServings, isMetric]);

  return (
    <div className="space-y-8">
      {/* Controls Card */}
      <div className="border-b border-base-300 pb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <label className="text-[10px] uppercase tracking-[0.2em] text-base-content/50 font-bold">
            Adjust Servings: <span className="text-primary text-lg ml-2">{servings}</span>
          </label>
          <input
            type="range"
            min="1"
            max="24"
            value={servings}
            onChange={(e) => setServings(Number(e.target.value))}
            className="input-range"
          />
        </div>

        <div className="flex items-center bg-base-200 border border-base-300">
          <button
            onClick={() => setIsMetric(false)}
            className={`px-6 py-2 text-[10px] uppercase tracking-widest font-bold transition-all ${!isMetric ? 'bg-base-content text-base-100' : 'text-base-content/40 hover:bg-base-300'}`}
          >
            Imperial
          </button>
          <button
            onClick={() => setIsMetric(true)}
            className={`px-6 py-2 text-[10px] uppercase tracking-widest font-bold transition-all ${isMetric ? 'bg-base-content text-base-100' : 'text-base-content/40 hover:bg-base-300'}`}
          >
            Metric
          </button>
        </div>
      </div>

      {/* Ingredients Table */}
      <div className="overflow-hidden">
        <ul className="divide-y divide-base-300">
          {scaledIngredients.map((ingredient, index) => (
            <li 
              key={index} 
              className="py-4 flex justify-between items-start group hover:bg-base-200/50 transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-bold text-base-content group-hover:text-primary transition-colors font-serif text-lg">
                  {ingredient.name}
                </span>
                {ingredient.notes && (
                  <span className="text-xs text-base-content/60 font-serif italic mt-1">
                    {ingredient.notes}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 text-xl font-bold font-serif tabular-nums min-w-[5rem] justify-end">
                 <AnimatePresence mode="popLayout">
                  <motion.span
                    key={`${ingredient.value}-${ingredient.unit}`}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 10, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="text-primary inline-block"
                  >
                    {ingredient.value}
                  </motion.span>
                </AnimatePresence>
                <span className="text-[10px] tracking-widest text-base-content/40 uppercase font-sans">
                  {ingredient.unit}
                </span>
              </div>

            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

