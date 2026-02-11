import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface TiltCardProps {
    children: React.ReactNode;
    className?: string;
    tiltStrength?: number;
}

const TiltCard: React.FC<TiltCardProps> = ({
    children,
    className = "",
    tiltStrength = 15
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 150, damping: 20 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 20 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], [tiltStrength, -tiltStrength]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-tiltStrength, tiltStrength]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXPos = e.clientX - rect.left;
        const mouseYPos = e.clientY - rect.top;
        const xPct = mouseXPos / width - 0.5;
        const yPct = mouseYPos / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            className={`relative transition-all duration-200 ease-out will-change-transform ${className}`}
        >
            <div style={{ transform: "translateZ(30px)" }} className="relative z-10 h-full">
                {children}
            </div>

            {/* Glossy Effect */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 0.4 : 0 }}
                style={{
                    background: 'linear-gradient(125deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 60%)',
                    pointerEvents: 'none'
                }}
                className="absolute inset-0 rounded-xl z-20 mix-blend-overlay"
            />
        </motion.div>
    );
};

export default TiltCard;
