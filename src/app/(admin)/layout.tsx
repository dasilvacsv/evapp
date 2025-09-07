import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Providers from '@/components/providers';
import DashboardContainer from '@/components/DashboardContainer'; // 👈 Importa el nuevo componente

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <Providers session={session}>
      {/* 👇 Renderiza el contenedor que maneja el estado */}
      <DashboardContainer>
        {children}
      </DashboardContainer>
    </Providers>
  );
}