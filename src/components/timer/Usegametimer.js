import { useEffect, useState, useRef } from "react";


export function useGameTimer(activeKey) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const prevKeyRef = useRef(null);

  useEffect(() => {
    if (!activeKey) {
      setElapsedSeconds(0);
      prevKeyRef.current = null;
      return;
    }

    if (prevKeyRef.current !== activeKey) {
      setElapsedSeconds(0);
      prevKeyRef.current = activeKey;
    }

    const intervalId = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [activeKey]);

  return elapsedSeconds;
}