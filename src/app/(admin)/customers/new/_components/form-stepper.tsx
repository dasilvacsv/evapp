// (admin)/customers/new/_components/form-stepper.tsx

'use client';

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  id: string;
  name: string;
}

interface FormStepperProps {
  steps: Step[];
  currentStep: number;
}

export default function FormStepper({ steps, currentStep }: FormStepperProps) {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
        {steps.map((step, index) => (
          <li key={step.name} className="md:flex-1">
            <div
              className="group flex flex-col border-l-4 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pl-0 md:pt-4 md:pb-0"
              className={cn(
                "group flex flex-col border-l-4 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pl-0 md:pt-4 md:pb-0",
                index < currentStep ? "border-primary" : 
                index === currentStep ? "border-primary" : "border-border"
              )}
            >
              <span className={cn(
                  "text-sm font-medium transition-colors",
                   index < currentStep ? "text-primary" : 
                   index === currentStep ? "text-primary" : "text-muted-foreground"
                )}>
                Paso {index + 1}
              </span>
              <span className="text-sm font-medium">{step.name}</span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}