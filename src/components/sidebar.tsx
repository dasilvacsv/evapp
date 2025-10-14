'use client';

import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  FileText,
  Users,
  Users2 as Team,
  Settings,
  Calculator,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp, // <-- CAMBIO: Se importa el nuevo ícono
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// --- CONFIGURACIÓN DEL MENÚ ---
const menuConfig = {
  super_admin: [
    { section: 'Principal', items: [
      { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
      { href: '/policies', label: 'Pólizas', icon: FileText },
      { href: '/customers', label: 'Clientes', icon: Users },
      { href: '/team', label: 'Equipo', icon: Team },
      { href: '/reports', label: 'Reportes', icon: TrendingUp }, // <-- CAMBIO: Se agrega la ruta de reportes
    ]},
    { section: 'Operaciones', items: [
      { href: '/processing', label: 'Procesamiento', icon: ClipboardList },
      { href: '/commissions', label: 'Comisiones', icon: Calculator },
    ]},
    { section: 'Sistema', items: [
      { href: '/settings', label: 'Ajustes', icon: Settings },
    ]}
  ],
  manager: [
    { section: 'Principal', items: [
      { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
      { href: '/policies', label: 'Pólizas', icon: FileText },
      { href: '/customers', label: 'Clientes', icon: Users },
      { href: '/team', label: 'Equipo', icon: Team },
      { href: '/reports', label: 'Reportes', icon: TrendingUp }, // <-- CAMBIO: Se agrega la ruta de reportes
    ]}
  ],
  agent: [
    { section: 'Principal', items: [
        { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
        { href: '/policies', label: 'Pólizas', icon: FileText },
        { href: '/customers', label: 'Clientes', icon: Users },
    ]}
  ],
  processor: [
    { section: 'Operaciones', items: [
        { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
        { href: '/processing', label: 'Procesamiento', icon: ClipboardList },
    ]}
  ],
  commission_analyst: [
    { section: 'Operaciones', items: [
        { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
        { href: '/commissions', label: 'Comisiones', icon: Calculator },
    ]}
  ],
  customer_service: [
    { section: 'Principal', items: [
        { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
        { href: '/customers', label: 'Clientes', icon: Users },
    ]}
  ],
};

// --- INTERFAZ DE PROPS ---
interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

// --- COMPONENTE PRINCIPAL DEL SIDEBAR ---
export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === 'loading') return <SidebarSkeleton isCollapsed={isCollapsed} />;
  if (!session?.user?.role) return null;

  const userRole = session.user.role as keyof typeof menuConfig;
  const menuSections = menuConfig[userRole] || [];
  const userName = session.user.name || 'Usuario';
  const userInitials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const userEmail = session.user.email;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden md:flex h-full flex-col fixed inset-y-0 z-50 bg-card card-shadow border-r transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* --- Encabezado --- */}
        <div className="flex items-center h-16 px-4 border-b">
          <Image
            src="/logo.png"
            alt="Logo Sistema EV"
            width={32}
            height={32}
            className={cn("h-7 w-7 transition-transform duration-300", isCollapsed && "mx-auto")}
          />
          <span className={cn("ml-2 text-lg font-bold text-foreground tracking-tight transition-opacity duration-200 whitespace-nowrap", isCollapsed && "opacity-0 hidden")}>
            Sistema EV
          </span>
        </div>

        {/* --- Navegación --- */}
        <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto">
          {menuSections.map((section, index) => (
            <div key={index}>
              <h2 className={cn("px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider", isCollapsed && "text-center")}>
                {isCollapsed ? "•" : section.section}
              </h2>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link href={item.href} className={cn('group relative flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200', 'hover:bg-muted hover:text-foreground', pathname === item.href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground', isCollapsed && 'justify-center')}>
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className={cn("ml-3 whitespace-nowrap", isCollapsed && "hidden")}>{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right"><p>{item.label}</p></TooltipContent>}
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </nav>
        
        {/* --- Pie de página y Botones Colapsar/Expandir --- */}
        <div className="mt-auto p-2 border-t">
          <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className={cn("w-full h-auto py-2 px-2 flex items-center", isCollapsed ? 'justify-center' : 'justify-start')}>
                          <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">{userInitials}</AvatarFallback>
                          </Avatar>
                          <div className={cn("ml-3 text-left", isCollapsed && "hidden")}>
                              <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                          </div>
                      </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right"><p>{userName}</p></TooltipContent>}
              </Tooltip>
              <DropdownMenuContent className="w-60 mb-2" side="top" align="start">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* BOTÓN PARA COLAPSAR (visible cuando está expandido) */}
            {!isCollapsed && (
              <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(true)} className="flex-shrink-0">
                  <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </Button>
            )}

            {/* BOTÓN PARA EXPANDIR (visible cuando está colapsado) */}
            {isCollapsed && (
              <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(false)}>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

// --- COMPONENTE DE CARGA (SKELETON) ---
function SidebarSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <aside className={cn(
      "hidden md:flex h-full flex-col fixed inset-y-0 z-50 bg-card border-r p-4 animate-pulse",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className="flex items-center gap-2 mb-8">
        <div className="h-8 w-8 bg-muted rounded-md"></div>
        {!isCollapsed && <div className="h-6 w-32 bg-muted rounded-md"></div>}
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          {!isCollapsed && <div className="h-4 w-20 bg-muted rounded-md"></div>}
          <div className="h-9 w-full bg-muted rounded-md"></div>
          <div className="h-9 w-full bg-muted rounded-md"></div>
        </div>
        <div className="space-y-2">
          {!isCollapsed && <div className="h-4 w-24 bg-muted rounded-md"></div>}
          <div className="h-9 w-full bg-muted rounded-md"></div>
        </div>
      </div>
      <div className="mt-auto h-12 w-full bg-muted rounded-md"></div>
    </aside>
  );
}