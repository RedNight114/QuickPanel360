import type { MetadataRoute } from 'next';
import { branding } from '@/lib/branding';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: branding.appName,
    short_name: branding.appName,
    description: branding.description,
    start_url: '/dashboard',
    display: 'standalone',
    background_color: branding.paper,
    theme_color: branding.yellow,
    orientation: 'any',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
