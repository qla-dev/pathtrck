import { useEffect, useState, type ReactNode } from 'react';

type TypewriterTextProps = {
  text: string;
  speed?: number;
  render: (text: string) => ReactNode;
  onUpdate?: () => void;
  onComplete?: () => void;
};

export const TypewriterText = ({
  text,
  speed = 6,
  render,
  onUpdate,
  onComplete,
}: TypewriterTextProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex >= text.length) {
      const timeout = window.setTimeout(() => onComplete?.(), 100);
      return () => window.clearTimeout(timeout);
    }

    const timeout = window.setTimeout(() => {
      setCurrentIndex((index) => index + 1);
    }, speed);

    return () => window.clearTimeout(timeout);
  }, [currentIndex, onComplete, speed, text.length]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => onUpdate?.());
    return () => window.cancelAnimationFrame(frame);
  }, [currentIndex, onUpdate]);

  return <>{render(text.slice(0, currentIndex))}</>;
};
