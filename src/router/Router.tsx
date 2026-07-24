import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Route =
  | 'dashboard'
  | 'categories'
  | 'products'
  | 'batches'
  | 'calculator'
  | 'receiving'
  | 'nonConforming'
  | 'healthCertificates'
  | 'search'
  | 'reports'
  | 'reportsArchive'
  | 'settings'
  | 'about';

interface RouterContextValue {
  route: Route;
  params: Record<string, string>;
  navigate: (route: Route, params?: Record<string, string>) => void;
  goBack: () => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function parseHash(): { route: Route; params: Record<string, string> } {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [routePart, queryPart] = hash.split('?');
  const route = (routePart || 'dashboard') as Route;
  const params: Record<string, string> = {};
  if (queryPart) {
    new URLSearchParams(queryPart).forEach((v, k) => (params[k] = v));
  }
  return { route: route as Route, params };
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(parseHash());
  // Counts in-app navigations (via navigate()) so goBack() can tell whether there is a
  // real in-app history to step back through, vs. the app having just been opened
  // directly on a sub-page (e.g. from a notification deep link) with nothing behind it.
  const [navCount, setNavCount] = useState(0);

  useEffect(() => {
    const onHashChange = () => setState(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((route: Route, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    window.location.hash = `/${route}${query}`;
    setNavCount((c) => c + 1);
  }, []);

  const goBack = useCallback(() => {
    if (navCount > 0) {
      window.history.back();
    } else {
      navigate('dashboard');
    }
  }, [navCount, navigate]);

  return (
    <RouterContext.Provider value={{ route: state.route, params: state.params, navigate, goBack }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
