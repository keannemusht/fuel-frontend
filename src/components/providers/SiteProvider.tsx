'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type JobSite = 'ALL' | 'SENYIUR' | 'MUARA_PAHU';

interface SiteContextType {
  site: JobSite;
  setSite: (site: JobSite) => void;
  siteLabel: string;
  isAllSites: boolean;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [site, setSiteState] = useState<JobSite>('SENYIUR');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('batara_selected_site') as JobSite;
      if (saved && (saved === 'ALL' || saved === 'SENYIUR' || saved === 'MUARA_PAHU')) {
        setSiteState(saved);
      }
    } catch {}
  }, []);

  const setSite = (newSite: JobSite) => {
    setSiteState(newSite);
    try {
      localStorage.setItem('batara_selected_site', newSite);
    } catch {}
  };

  const siteLabel =
    site === 'SENYIUR'
      ? 'Site Senyiur'
      : site === 'MUARA_PAHU'
      ? 'Site Muara Pahu'
      : 'Semua Site';

  return (
    <SiteContext.Provider
      value={{
        site,
        setSite,
        siteLabel,
        isAllSites: site === 'ALL',
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
}

