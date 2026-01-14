import { useState } from 'react';
import { OnboardingSidebar } from '@/components/onboarding/OnboardingSidebar';
import { WelcomeStep } from '@/components/onboarding/steps/WelcomeStep';
import { SyncStep } from '@/components/onboarding/steps/SyncStep';
import { ConfigStep } from '@/components/onboarding/steps/ConfigStep';
import { PropertiesStep } from '@/components/onboarding/steps/PropertiesStep';
import { TeamStep } from '@/components/onboarding/steps/TeamStep';
import { InventoryStep } from '@/components/onboarding/steps/InventoryStep';
import { ChecklistsStep } from '@/components/onboarding/steps/ChecklistsStep';
import { HouseRulesStep } from '@/components/onboarding/steps/HouseRulesStep';
import { ReviewStep } from '@/components/onboarding/steps/ReviewStep';

export type OnboardingStep = 
  | 'welcome'
  | 'sync'
  | 'config'
  | 'properties'
  | 'team'
  | 'inventory'
  | 'checklists'
  | 'rules'
  | 'review';

export const STEPS: { id: OnboardingStep; label: string; number: number }[] = [
  { id: 'welcome', label: 'Boas-vindas', number: 1 },
  { id: 'sync', label: 'Sincronização', number: 2 },
  { id: 'config', label: 'Configurações', number: 3 },
  { id: 'properties', label: 'Propriedades', number: 4 },
  { id: 'team', label: 'Equipe', number: 5 },
  { id: 'inventory', label: 'Inventário', number: 6 },
  { id: 'checklists', label: 'Checklists', number: 7 },
  { id: 'rules', label: 'Regras da Casa', number: 8 },
  { id: 'review', label: 'Revisão Final', number: 9 },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [completedSteps, setCompletedSteps] = useState<Set<OnboardingStep>>(new Set());

  const handleNext = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  const handleGoToStep = (step: OnboardingStep) => {
    const targetIndex = STEPS.findIndex(s => s.id === step);
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    
    // Allow going to any completed step or the next available step
    if (completedSteps.has(step) || targetIndex <= currentIndex) {
      setCurrentStep(step);
    }
  };

  const renderStep = () => {
    const stepProps = { onNext: handleNext, onBack: handleBack };
    
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={handleNext} />;
      case 'sync':
        return <SyncStep {...stepProps} />;
      case 'config':
        return <ConfigStep {...stepProps} />;
      case 'properties':
        return <PropertiesStep {...stepProps} />;
      case 'team':
        return <TeamStep {...stepProps} />;
      case 'inventory':
        return <InventoryStep {...stepProps} />;
      case 'checklists':
        return <ChecklistsStep {...stepProps} />;
      case 'rules':
        return <HouseRulesStep {...stepProps} />;
      case 'review':
        return <ReviewStep onBack={handleBack} />;
      default:
        return <WelcomeStep onNext={handleNext} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <OnboardingSidebar 
        currentStep={currentStep} 
        completedSteps={completedSteps}
        onGoToStep={handleGoToStep}
      />
      <main className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto">
        {renderStep()}
      </main>
    </div>
  );
}
