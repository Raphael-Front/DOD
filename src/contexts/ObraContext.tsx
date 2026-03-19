"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
} from "react";

const STORAGE_KEY = "diario-obra-selected-obra";

type ObraContextType = {
  obraId: string | null;
  setObraId: (id: string | null) => void;
};

const ObraContext = createContext<ObraContextType | undefined>(undefined);

export function ObraProvider({ children }: { children: React.ReactNode }) {
  const [obraId, setObraIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setObraIdState(stored);
    } finally {
      setHydrated(true);
    }
  }, []);

  const setObraId = useCallback((id: string | null) => {
    setObraIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <ObraContext.Provider value={{ obraId: hydrated ? obraId : null, setObraId }}>
      {children}
    </ObraContext.Provider>
  );
}

export function useObra() {
  const context = useContext(ObraContext);
  if (context === undefined) {
    throw new Error("useObra must be used within an ObraProvider");
  }
  return context;
}
