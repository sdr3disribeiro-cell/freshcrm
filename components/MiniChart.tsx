import React from 'react';

interface MiniChartProps {
    data: number[];
    color?: string;
    height?: number;
}

const MiniChart: React.FC<MiniChartProps> = ({ data, color = "#3b82f6", height = 40 }) => {
    if (!data || data.length < 2) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 100;

    // Create points for the line
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height; // Invert Y
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible opacity-50">
            {/* Area Fill */}
            <path
                d={`M0,${height} ${points} M${width},${height} Z`}
                fill={color}
                fillOpacity="0.2"
            />
            {/* Line Stroke */}
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default MiniChart;
