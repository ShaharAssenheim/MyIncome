"use client";
import React, { useRef, useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MonthSelectorProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ currentDate, onPrevMonth, onNextMonth }) => {
  const formattedDate = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(currentDate);
  const isRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const directionMultiplier = isRTL ? -1 : 1;
  
  // Track direction for animation
  const prevDateRef = useRef(currentDate);
  const [direction, setDirection] = useState(0);

  const MotionButton = motion.button as any;
  const MotionDiv = motion.div as any;

  useEffect(() => {
    if (currentDate.getTime() > prevDateRef.current.getTime()) {
      setDirection(1); // Next
    } else if (currentDate.getTime() < prevDateRef.current.getTime()) {
      setDirection(-1); // Prev
    }
    prevDateRef.current = currentDate;
  }, [currentDate]);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? -50 * directionMultiplier : 50 * directionMultiplier,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? 50 * directionMultiplier : -50 * directionMultiplier,
      opacity: 0,
      scale: 0.95
    })
  };

  return (
    <div className="flex items-center justify-between bg-white p-2 rounded-2xl shadow-sm border border-slate-100 mb-6">
      <MotionButton 
        whileHover={{ scale: 1.1, backgroundColor: "#f1f5f9" }}
        whileTap={{ scale: 0.9 }}
        onClick={onPrevMonth}
        className="p-3 rounded-xl text-slate-600 relative z-10 transition-colors"
        aria-label="חודש קודם"
      >
        <ChevronRight size={24} />
      </MotionButton>
      
      <div className="flex-1 relative h-10 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <MotionDiv
            key={formattedDate} // Key change triggers animation
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 flex items-center justify-center gap-3 w-full"
          >
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                <Calendar size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 capitalize select-none whitespace-nowrap">
              {formattedDate}
            </h2>
          </MotionDiv>
        </AnimatePresence>
      </div>

      <MotionButton 
        whileHover={{ scale: 1.1, backgroundColor: "#f1f5f9" }}
        whileTap={{ scale: 0.9 }}
        onClick={onNextMonth}
        className="p-3 rounded-xl text-slate-600 relative z-10 transition-colors"
        aria-label="חודש הבא"
      >
        <ChevronLeft size={24} />
      </MotionButton>
    </div>
  );
};