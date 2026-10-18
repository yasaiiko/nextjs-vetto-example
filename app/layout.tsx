import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Next.js + Vetto signup example',
  description: 'Block disposable and fake signup emails in Next.js with one script tag and a Server Action check.',
};

const siteKey = process.env.NEXT_PUBLIC_VETTO_SITE_KEY;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Browser check: typo fixes, throwaway and dead-domain blocking, bot honeypot.
            Free on one site. Without a key the form still works and the server check runs. */}
        {siteKey && <Script src="https://usevetto.com/v.js" data-site={siteKey} strategy="afterInteractive" />}
      </body>
    </html>
  );
}
