'use client';

import { useEffect, useRef } from 'react';
import type { TutorialStep } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type TutorialProps = {
  steps: TutorialStep[];
  stepIndex: number;
  onStepChange: (index: number) => void;
  onComplete: () => void;
};

export default function Tutorial({ steps, stepIndex, onStepChange, onComplete }: TutorialProps) {
  const currentStep = steps[stepIndex];
  const targetElement = currentStep?.targetRef?.current;
  const popoverRef = useRef<HTMLDivElement>(null);

  const getTargetRect = () => {
    if (!targetElement) return null;
    return targetElement.getBoundingClientRect();
  };

  const targetRect = getTargetRect();

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      onStepChange(stepIndex + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      onStepChange(stepIndex - 1);
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onComplete();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  const popoverPosition = {
    top: 0,
    left: 0,
  };

  if (targetRect && popoverRef.current) {
    const popoverRect = popoverRef.current.getBoundingClientRect();
    switch (currentStep.placement) {
      case 'top':
        popoverPosition.top = targetRect.top - popoverRect.height - 10;
        popoverPosition.left = targetRect.left + targetRect.width / 2 - popoverRect.width / 2;
        break;
      case 'bottom':
        popoverPosition.top = targetRect.bottom + 10;
        popoverPosition.left = targetRect.left + targetRect.width / 2 - popoverRect.width / 2;
        break;
      case 'left':
        popoverPosition.top = targetRect.top + targetRect.height / 2 - popoverRect.height / 2;
        popoverPosition.left = targetRect.left - popoverRect.width - 10;
        break;
      case 'right':
        popoverPosition.top = targetRect.top + targetRect.height / 2 - popoverRect.height / 2;
        popoverPosition.left = targetRect.right + 10;
        break;
       case 'center':
        popoverPosition.top = window.innerHeight / 2 - popoverRect.height / 2;
        popoverPosition.left = window.innerWidth / 2 - popoverRect.width / 2;
        break;
    }
  } else if (popoverRef.current && currentStep.placement === 'center') {
      const popoverRect = popoverRef.current.getBoundingClientRect();
      popoverPosition.top = window.innerHeight / 2 - popoverRect.height / 2;
      popoverPosition.left = window.innerWidth / 2 - popoverRect.width / 2;
  }

  const clipPath = targetRect 
    ? `path(evenodd, 'M-1 -1 H${window.innerWidth+1} V${window.innerHeight+1} H-1 Z M${targetRect.left - 5} ${targetRect.top - 5} H${targetRect.right + 5} V${targetRect.bottom + 5} H${targetRect.left - 5} Z')`
    : 'none';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        style={{ clipPath: clipPath !== 'none' ? clipPath : 'none' }}
      ></div>

      {currentStep && (
        <div
          ref={popoverRef}
          className={cn(
            "fixed z-50 w-80 rounded-lg bg-card p-6 shadow-2xl transition-all duration-300",
             popoverPosition.top === 0 && popoverPosition.left === 0 ? 'opacity-0' : 'opacity-100' // Hide until positioned
            )}
          style={{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
          }}
        >
          <h3 className="text-lg font-bold mb-2">{currentStep.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{currentStep.content}</p>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {stepIndex + 1} / {steps.length}
            </span>
            <div className="flex gap-2">
              {stepIndex > 0 && (
                 <Button variant="outline" size="sm" onClick={handlePrev}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Prev
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
