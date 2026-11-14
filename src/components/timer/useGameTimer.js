import { useEffect, useState, useRef } from "react";

export function useGameTimer(activeKey) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const prevKeyRef = useRef(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!activeKey) {
      setElapsedSeconds(0);
      prevKeyRef.current = null;
      startedAtRef.current = 0;
      return;
    }

    if (prevKeyRef.current !== activeKey) {
      setElapsedSeconds(0);
      prevKeyRef.current = activeKey;
      startedAtRef.current = Date.now();
    }

    const intervalId = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [activeKey]);

  return elapsedSeconds;
}
