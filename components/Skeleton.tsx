import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, width, height }) => {
    return (
        <div
            className={`relative overflow-hidden bg-slate-200 dark:bg-slate-700 rounded ${className}`}
            style={{ width, height }}
        >
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: 'linear',
                }}
            />
        </div>
    );
};

export const TableSkeleton: React.FC = () => {
    return (
        <div className="w-full">
            <div className="flex items-center gap-4 mb-4 p-4">
                <Skeleton width={200} height={32} />
                <div className="flex-1" />
                <Skeleton width={100} height={32} />
                <Skeleton width={100} height={32} />
            </div>
            <div className="space-y-4 p-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                        <Skeleton width={40} height={40} className="rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton width="40%" height={16} />
                            <Skeleton width="20%" height={12} />
                        </div>
                        <Skeleton width={100} height={40} />
                    </div>
                ))}
            </div>
        </div>
    );
};
