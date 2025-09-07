// components/ui/waitlist-nav-link.tsx

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface WaitlistNavLinkProps {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const WaitlistNavLink = ({ href, children, onClick, className }: WaitlistNavLinkProps) => {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2",
        "bg-gradient-to-r from-amber-500 to-orange-600 text-white",
        "hover:from-amber-400 hover:to-orange-500 hover:scale-105",
        "shadow-lg shadow-black/30",
        "animate-pulse-glow", // <-- Aquí aplicamos nuestra animación
        className
      )}
    >
      {children}
    </Link>
  );
};