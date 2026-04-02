import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans'
});

export const metadata: Metadata = {
  title: 'Remote Care Companion',
  description: 'Caretaker dashboard for connected patient monitoring and response'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={manrope.variable}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              background: '#141b19',
              color: '#dde4e0'
            }
          }}
        />
      </body>
    </html>
  );
}
