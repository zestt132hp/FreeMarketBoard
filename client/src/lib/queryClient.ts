import { QueryClient as TanStackQueryClient } from "@tanstack/react-query";

// Compatibility wrapper for older code
export const QueryClient = TanStackQueryClient;

// Helper function to get the correct API URL based on environment
export function getApiUrl(path: string): string {
  const isDev = import.meta.env.MODE === 'development';
  const isSeparateServer = window.location.port === '3001';
  
  // If we're in development and running on port 3001 (separate client),
  // we need to use the full server URL because Vite proxy doesn't work
  if (isDev && isSeparateServer && path.startsWith('/api')) {
    return `http://localhost:5000${path}`;
  }
  
  // For Vite dev server (port 3000), the proxy will handle /api requests
  return path;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // In development, when running client and server separately,
  // we need to use the full server URL
  const isDev = import.meta.env.MODE === 'development';
  const isSeparateServer = window.location.port === '3001';
  
  const targetUrl = isDev && isSeparateServer && url.startsWith('/api')
    ? `http://localhost:5000${url}`
    : url;

  const res = await fetch(targetUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => any =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }: { queryKey: any }) => {
    let targetUrl = queryKey[0] as string;
    
    // Apply the same logic for query functions
    const isDev = import.meta.env.MODE === 'development';
    const isSeparateServer = window.location.port === '3001';
    
    if (isDev && isSeparateServer && targetUrl.startsWith('/api')) {
      targetUrl = `http://localhost:5000${targetUrl}`;
    }
    
    const res = await fetch(targetUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
