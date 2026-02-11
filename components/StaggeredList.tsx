import React, { ReactNode } from 'react';

interface StaggeredListProps extends React.HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    staggerDelay?: number;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({ children, className, staggerDelay, ...props }) => {
    return (
        <div className={className} {...props}>
            {children}
        </div>
    );
};

interface StaggeredItemProps extends React.HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    whileHover?: any; // Keep prop to avoid type errors in consumers
}

export const StaggeredItem: React.FC<StaggeredItemProps> = ({ children, className, whileHover, ...props }) => {
    return (
        <div className={className} {...props}>
            {children}
        </div>
    );
};
