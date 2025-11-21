import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { IncomeType } from '../types';
import { CATEGORIES, getCategoryIcon } from '../constants';

interface CategoryCardProps {
  type: IncomeType;
  amount: number;
  onAddClick: (type: IncomeType) => void;
  delay?: number;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ type, amount, onAddClick, delay = 0 }) => {
  const config = CATEGORIES[type];
  const formattedAmount = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.5, delay, type: "spring", stiffness: 100 }
      }}
      whileHover={{ 
        scale: 1.03,
        y: -5,
        transition: { duration: 0.2, type: "spring", stiffness: 300 }
      }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative overflow-hidden rounded-3xl p-6 md:p-8 border transition-shadow duration-300 
        bg-gradient-to-br ${config.bgStart} ${config.bgEnd} 
        border-white shadow-sm hover:shadow-xl group cursor-pointer
        h-full flex flex-col justify-between
      `}
      onClick={() => onAddClick(type)}
    >
      <div className="flex justify-between items-start mb-6 md:mb-8 relative z-10">
        <div className={`
            p-3 md:p-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm ${config.iconColor}
            transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3
        `}>
          {getCategoryIcon(type, 28)}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onAddClick(type); }}
          className={`
            p-2 md:p-3 rounded-full bg-white hover:bg-opacity-90 transition-all shadow-sm ${config.iconColor}
            active:scale-90 hover:shadow-md
          `}
          aria-label={`הוסף הכנסה ל${config.label}`}
        >
          <Plus size={22} />
        </button>
      </div>
      
      <div className="relative z-10">
        <h3 className={`text-sm md:text-base font-semibold mb-1 ${config.textColor} opacity-70 tracking-wide`}>
          {config.label}
        </h3>
        <p className={`text-3xl md:text-5xl font-extrabold ${config.textColor} tracking-tight`}>
          {formattedAmount}
        </p>
      </div>

      {/* Decorative large icon background */}
      <div className={`
        absolute -bottom-6 -left-6 opacity-[0.05] transform rotate-12 scale-150 pointer-events-none 
        transition-transform duration-700 group-hover:scale-[1.8] group-hover:rotate-6 ${config.textColor}
      `}>
         {getCategoryIcon(type, 140)}
      </div>
    </motion.div>
  );
};