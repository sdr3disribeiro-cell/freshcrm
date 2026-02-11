import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface AnimatedButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
  isLoading?: boolean;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary',
  isLoading = false,
  disabled,
  ...props 
}) => {
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20",
    secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-900/20",
    ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
    glass: "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-xl"
  };

  const disabledClass = "opacity-50 cursor-not-allowed grayscale";

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`
        relative overflow-hidden
        px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors
        ${variants[variant]}
        ${(disabled || isLoading) ? disabledClass : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-1"
        />
      )}
      {children}
    </motion.button>
  );
};

export default AnimatedButton;
