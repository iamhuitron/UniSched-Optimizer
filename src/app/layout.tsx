import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'horario-óptimo',
  description: 'Genera el mejor horario universitario sin choques a partir del PDF oficial de tu escuela.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
