import { PolicyEngineShell } from "@policyengine/ui-kit/layout";
import "@policyengine/ui-kit/styles.css";

import type { Metadata, Viewport } from 'next';
import './globals.css';
import PolicyEngineHeader from '@/components/PolicyEngineHeader';

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
        <PolicyEngineHeader />
        {children}
              </PolicyEngineShell>
      </body>
    </html>
  );
}
