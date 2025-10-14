'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LogOut,
  Menu,
  Search,
  BarChart3,
  FileText,
  Users,
  Users2 as Team,
  Settings,
  Calculator,
  ClipboardList,
  TrendingUp, // <-- CAMBIO: Se importa el nuevo ícono
} from 'lucide-react';

// --- CONFIGURACIÓN DEL MENÚ ---
// Debe ser idéntica a la que usas en el Sidebar para mantener la consistencia.
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
interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

// --- COMPONENTE PRINCIPAL DEL HEADER ---
export default function Header({ toggleSidebar, isSidebarCollapsed }: HeaderProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [openCommand, setOpenCommand] = useState(false);

  // Efecto para el atajo de teclado (Ctrl+K o ⌘K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpenCommand((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => unknown) => {
    setOpenCommand(false);
    command();
  };

  if (status === 'loading') return <HeaderSkeleton />;
  if (!session?.user?.role) return null;

  const userRole = session.user.role as keyof typeof menuConfig;
  const menuSections = menuConfig[userRole] || [];
  const initials = session.user.name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U';

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-card/80 backdrop-blur-sm border-b h-16 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* BOTÓN DE BÚSQUEDA QUE ABRE EL MENÚ DE COMANDOS */}
          <Button
            variant="outline"
            className={cn(
              "relative hidden h-9 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64",
              "md:flex" // Aseguramos que se muestre en md y superior
            )}
            onClick={() => setOpenCommand(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline-flex">Buscar...</span>
            <span className="inline-flex lg:hidden">Buscar</span>
            <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>

        {/* Menú de Usuario */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary transition-colors">
                <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{session.user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => signOut({ callbackUrl: '/login' })} 
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      
      {/* DIÁLOGO DEL MENÚ DE COMANDOS */}
      <CommandDialog open={openCommand} onOpenChange={setOpenCommand}>
        <CommandInput placeholder="Escribe para buscar una página..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          {menuSections.map((section) => (
            <CommandGroup key={section.section} heading={section.section}>
              {section.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.label}
                  onSelect={() => runCommand(() => router.push(item.href))}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

// --- COMPONENTE DE CARGA (SKELETON) ---
function HeaderSkeleton() {
  return (
    <header className="bg-card border-b h-16 flex items-center justify-between px-4 md:px-6 animate-pulse">
      <div className="h-9 w-48 bg-muted rounded-md hidden md:block"></div>
      <div className="h-10 w-10 bg-muted rounded-full"></div>
    </header>
  );
}