import { useEffect, useState } from "react";
import { useMotionValue, useSpring, useTransform } from "framer-motion";

interface UseAnimatedValueOptions {
  duration?: number;
  stiffness?: number;
  damping?: number;
}

export function useAnimatedValue(
  value: number,
  options: UseAnimatedValueOptions = {}
) {
  const { stiffness = 100, damping = 30 } = options;
  
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness, damping });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayValue(Math.round(latest));
    });
    return unsubscribe;
  }, [springValue]);

  return displayValue;
}

export function useAnimatedPercentage(
  current: number,
  total: number,
  options: UseAnimatedValueOptions = {}
) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return useAnimatedValue(percentage, options);
}

export function useAnimatedCurrency(
  value: number,
  options: UseAnimatedValueOptions = {}
) {
  const animatedValue = useAnimatedValue(value, options);
  
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(animatedValue);
}
