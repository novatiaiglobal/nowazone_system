import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';
import ThemeProviderWrapper from '@/components/ThemeProviderWrapper';
import QueryProvider from '@/components/providers/QueryProvider';
import GoogleAnalytics from '@/components/GoogleAnalytics';

const inter = Inter({ subsets: ['latin'] });

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  title: 'Enterprise Dashboard',
  description: 'Enterprise management system',
  ...(googleVerification && {
    verification: { google: googleVerification },
  }),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
     <body className={inter.className}>
        <GoogleAnalytics />
        <ThemeProviderWrapper>
          <QueryProvider>
            {children}
            <ToastContainer
            position="top-right"
            autoClose={2000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss={false}
            draggable
            pauseOnHover={false}
            theme="colored"
            />
          </QueryProvider>
        </ThemeProviderWrapper>
    </body>
    </html>
  );
}
