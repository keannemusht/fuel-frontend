import type { Metadata } from 'next';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';
import QueryProvider from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { SiteProvider } from '@/components/providers/SiteProvider';
import ToastProvider from '@/components/providers/ToastProvider';

export const metadata: Metadata = {
  title: 'Batara Fuel Monitoring System (FMS-Core)',
  description: 'Mission-Critical Industrial Fuel Dispensing Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('fms_theme') || 'dark';
                document.documentElement.classList.remove('dark', 'light');
                document.documentElement.classList.add(theme);
                document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <QueryProvider>
          <LanguageProvider>
            <AuthProvider>
              <SiteProvider>
                <ThemeProvider>
                  {children}
                  <ToastProvider />
                </ThemeProvider>
              </SiteProvider>
            </AuthProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
