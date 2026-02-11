import React, { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface AnimatedCounterProps {
    value: number;
    direction?: "up" | "down";
    className?: string;
    formatter?: (value: number) => string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
    value,
    direction = "up",
    className = "",
    formatter = (v) => v.toString(),
}) => {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(direction === "down" ? value : 0);
    const springValue = useSpring(motionValue, {
        damping: 50,
        stiffness: 100,
    });
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    useEffect(() => {
        if (isInView) {
            motionValue.set(value);
        }
    }, [motionValue, value, isInView]);

    useEffect(() => {
        return springValue.on("change", (latest) => {
            if (ref.current) {
                ref.current.textContent = formatter(Math.floor(latest));
            }
        });
    }, [springValue, formatter]);

    return <span className={className} ref={ref} />;
};

export default AnimatedCounter;
