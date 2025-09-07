// app/layout.tsx

import './globals.css';
import type { Metadata } from 'next';
// 1. Importa Poppins en lugar de Inter
import { Poppins } from 'next/font/google';

// 2. Configura Poppins con los grosores y la variable CSS
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'], // Añade los grosores que necesites
  variable: '--font-poppins', // Define el nombre de la variable CSS
});

export const metadata: Metadata = {
  title: 'Sistema EV',
  description: 'Plataforma de gestión EV',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 3. Aplica la variable de la fuente al tag <html>
    <html lang="es" className={`${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}