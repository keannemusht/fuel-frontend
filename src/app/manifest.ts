import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Batara Fuel Monitoring System',
    short_name: 'Batara FMS',
    description: 'Industrial Fuel Dispensing & Telemetry Management System with Offline Support',
    start_url: '/dispenser',
    display: 'standalone',
    background_color: '#0B0F17',
    theme_color: '#0F172A',
    orientation: 'any',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
