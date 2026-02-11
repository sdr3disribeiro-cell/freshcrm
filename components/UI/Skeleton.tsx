import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'rectangular' | 'circular' | 'text';
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width, 
  height, 
  variant = 'rectangular' 
}) => {
  const baseClasses = "bg-slate-200 dark:bg-slate-700 animate-pulse";
  const variantClasses = {
    rectangular: "rounded-md",
    circular: "rounded-full",
    text: "rounded h-4 w-full"
  };

  const style = {
    width: width,
    height: height
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

export default Skeleton;
