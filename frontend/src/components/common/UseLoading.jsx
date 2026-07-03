import { useState, useCallback } from "react";

export default function useLoading() {
  const [isLoading, setIsLoading] = useState(false);

  const showLoading = useCallback(() => setIsLoading(true), []);
  const hideLoading = useCallback(() => setIsLoading(false), []);

  // Wraps an async function — shows loader before, hides after (even on error)
  const withLoading = useCallback(async (fn) => {
    setIsLoading(true);
    try {
      return await fn();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, showLoading, hideLoading, withLoading };
}
