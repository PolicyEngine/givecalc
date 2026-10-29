import { PolicyEngineShell } from "@policyengine/ui-kit/layout";
import "@policyengine/ui-kit/styles.css";
import "policyengine-household-wizard/styles.css";

import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
const TITLE = 'GiveCalc - Charitable Donation Tax Calculator';
const DESCRIPTION =
  'Calculate how charitable giving affects your taxes. Powered by PolicyEngine.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  authors: [{ name: 'PolicyEngine' }],
  icons: {
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/favicon.svg`,
  },
};

export const viewport: Viewport = {
  themeColor: '#319795',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PolicyEngineShell country="us">
        {children}
              </PolicyEngineShell>
        {/* Google Analytics: policyengine.org's GA4 property; this app is served at policyengine.org/us/givecalc through a rewrite, where the main site's GA does not reach. */}
        {process.env.NODE_ENV === 'production' && (
          <>
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-2YHG89FY0N"
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-2YHG89FY0N');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
