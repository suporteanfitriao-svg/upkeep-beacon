import { useState } from 'react';
import { SuperAdminSidebar } from '@/components/superadmin/SuperAdminSidebar';
import { SuperAdminHeader } from '@/components/superadmin/SuperAdminHeader';
import { OverviewSection } from '@/components/superadmin/sections/OverviewSection';
import { PropertiesSection } from '@/components/superadmin/sections/PropertiesSection';
import { UsersSection } from '@/components/superadmin/sections/UsersSection';
import { AuditSection } from '@/components/superadmin/sections/AuditSection';
import { PlansSection } from '@/components/superadmin/sections/PlansSection';
import { SecuritySection } from '@/components/superadmin/sections/SecuritySection';

export type SuperAdminSection = 
  | 'overview'
  | 'properties'
  | 'users'
  | 'audit'
  | 'plans'
  | 'security';

export default function SuperAdmin() {
  const [activeSection, setActiveSection] = useState<SuperAdminSection>('overview');
  const [viewMode, setViewMode] = useState<'global' | 'regional'>('global');

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <OverviewSection 
            viewMode={viewMode} 
            onNavigateToSection={(section) => setActiveSection(section as SuperAdminSection)} 
          />
        );
      case 'properties':
        return <PropertiesSection />;
      case 'users':
        return <UsersSection />;
      case 'audit':
        return <AuditSection />;
      case 'plans':
        return <PlansSection />;
      case 'security':
        return <SecuritySection />;
      default:
        return (
          <OverviewSection 
            viewMode={viewMode} 
            onNavigateToSection={(section) => setActiveSection(section as SuperAdminSection)} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <SuperAdminSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
      />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <SuperAdminHeader 
          activeSection={activeSection}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {renderSection()}
        </div>
      </main>
    </div>
  );
}
