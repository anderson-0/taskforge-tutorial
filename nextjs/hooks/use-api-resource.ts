"use client";

import { useCallback, useEffect, useState } from "react";
import { logger } from "@/lib/logger";

async function fetchResource<T>(url: string): Promise<T | null> {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  return response.json();
}

export function useApiResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setData(await fetchResource<T>(url));
    } catch (error) {
      logger.error({ error, url }, "Failed to refresh API resource");
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    let isCurrent = true;

    void fetchResource<T>(url)
      .then((resource) => {
        if (isCurrent) setData(resource);
      })
      .catch((error: unknown) => {
        logger.error({ error, url }, "Failed to load API resource");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [url]);

  return { data, isLoading, refresh };
}
