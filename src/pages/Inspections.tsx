import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ClipboardCheck } from 'lucide-react';

const Inspections = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 p-6">
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <ClipboardCheck className="h-16 w-16 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Inspeções</h1>
            <p className="text-muted-foreground max-w-md">
              Esta funcionalidade está em desenvolvimento. Em breve você poderá gerenciar inspeções de propriedades aqui.
            </p>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Inspections;
