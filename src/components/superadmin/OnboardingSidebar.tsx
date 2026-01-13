import { cn } from '@/lib/utils';
import { STEPS, OnboardingStep } from '@/pages/SuperAdmin';
import logo from '@/assets/logo.png';
import { Check } from 'lucide-react';

interface OnboardingSidebarProps {
  currentStep: OnboardingStep;
  completedSteps: Set<OnboardingStep>;
  onGoToStep: (step: OnboardingStep) => void;
}

export function OnboardingSidebar({ currentStep, completedSteps, onGoToStep }: OnboardingSidebarProps) {
  return (
    <aside className="w-80 bg-muted/30 border-r border-border hidden md:flex flex-col p-8 overflow-y-auto">
      <div className="mb-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center overflow-hidden">
          <img src={logo} alt="Super Host Lab" className="w-8 h-8 object-contain" />
        </div>
        <h1 className="font-bold text-lg tracking-tight text-foreground">Super Host Lab</h1>
      </div>

      <nav className="space-y-2">
        {STEPS.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.has(step.id);
          const currentIndex = STEPS.findIndex(s => s.id === currentStep);
          const stepIndex = STEPS.findIndex(s => s.id === step.id);
          const isClickable = isCompleted || stepIndex <= currentIndex;

          return (
            <button
              key={step.id}
              onClick={() => isClickable && onGoToStep(step.id)}
              disabled={!isClickable}
              className={cn(
                "w-full flex items-center gap-4 border-l-2 pl-4 -ml-[2px] py-2 transition-all text-left",
                isActive && "text-primary font-semibold border-primary",
                !isActive && isCompleted && "text-muted-foreground border-primary/50 hover:text-foreground",
                !isActive && !isCompleted && "text-muted-foreground border-border",
                isClickable && !isActive && "cursor-pointer hover:border-primary/70",
                !isClickable && "cursor-not-allowed opacity-60"
              )}
            >
              <span
                className={cn(
                  "flex-none w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  !isActive && isCompleted && "bg-primary/20 text-primary",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted && !isActive ? (
                  <Check className="h-3 w-3" />
                ) : (
                  step.number
                )}
              </span>
              <span className="text-sm">{step.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
