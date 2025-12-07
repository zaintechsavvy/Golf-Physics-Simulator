'use client';

import { Button } from '@/components/ui/button';
import { Pause, Play, RotateCcw, Trash2, ZoomIn, ZoomOut, Rabbit, Snail, Save, SheetIcon, HelpCircle } from 'lucide-react';
import type { SimulationStatus } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"

type SimulationControlsProps = {
  status: SimulationStatus;
  isSlowMotion: boolean;
  onSwing: () => void;
  onPause: () => void;
  onPlay: () => void;
  onReset: () => void;
  onClearPath: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleSlowMotion: () => void;
  onStoreRun: () => void;
  canStoreRun: boolean;
  dataTable: React.ReactNode;
  onShowTutorial: () => void;
  swingButtonRef: React.Ref<HTMLButtonElement>;
  storeButtonRef: React.Ref<HTMLButtonElement>;
  dataTableButtonRef: React.Ref<HTMLButtonElement>;
  zoomControlsRef: React.Ref<HTMLDivElement>;
};

const ControlButton = ({ tooltip, children, ...props }: { tooltip: string } & React.ComponentProps<typeof Button>) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button {...props}>{children}</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>{tooltip}</p>
    </TooltipContent>
  </Tooltip>
);

export default function SimulationControls({
  status,
  isSlowMotion,
  onSwing,
  onPause,
  onPlay,
  onReset,
  onClearPath,
  onZoomIn,
  onZoomOut,
  onToggleSlowMotion,
  onStoreRun,
  canStoreRun,
  dataTable,
  onShowTutorial,
  swingButtonRef,
  storeButtonRef,
  dataTableButtonRef,
  zoomControlsRef,
}: SimulationControlsProps) {
  const isSimulating = status === 'flying' || status === 'paused';

  return (
    <TooltipProvider>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-2 p-2 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg">
          {status !== 'flying' && status !== 'paused' && (
            <Button ref={swingButtonRef} size="lg" onClick={onSwing} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
              <Play className="mr-2 h-5 w-5 fill-current" />
              Swing
            </Button>
          )}

          {status === 'flying' && (
            <ControlButton variant="outline" size="icon" onClick={onPause} tooltip="Pause">
              <Pause />
            </ControlButton>
          )}

          {status === 'paused' && (
            <ControlButton variant="outline" size="icon" onClick={onPlay} tooltip="Play">
              <Play />
            </ControlButton>
          )}
          
          <ControlButton variant="outline" size="icon" onClick={onToggleSlowMotion} tooltip={isSlowMotion ? "Normal Speed" : "Slow Motion"}>
            {isSlowMotion ? <Rabbit /> : <Snail />}
          </ControlButton>
          
          <ControlButton variant="outline" size="icon" onClick={onClearPath} disabled={!isSimulating} tooltip="Clear Path">
            <Trash2 />
          </ControlButton>

          <Button 
            ref={storeButtonRef}
            onClick={onStoreRun} 
            disabled={!canStoreRun}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
          >
            Store
            <Save className="ml-2 h-4 w-4" />
          </Button>

          <Dialog>
            <Tooltip>
              <TooltipTrigger asChild>
                 <DialogTrigger asChild>
                    <Button ref={dataTableButtonRef} variant="outline" size="icon"><SheetIcon /></Button>
                 </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>View Stored Runs</p>
              </TooltipContent>
            </Tooltip>
            <DialogContent className="max-w-4xl">
              {dataTable}
            </DialogContent>
          </Dialog>

          <ControlButton variant="outline" size="icon" onClick={onReset} tooltip="Reset">
            <RotateCcw />
          </ControlButton>
        </div>
      </div>
      <div ref={zoomControlsRef} className="absolute top-4 left-4 z-10 flex flex-col gap-2">
         <ControlButton variant="outline" size="icon" onClick={onZoomIn} tooltip="Zoom In">
            <ZoomIn />
         </ControlButton>
         <ControlButton variant="outline" size="icon" onClick={onZoomOut} tooltip="Zoom Out">
            <ZoomOut />
         </ControlButton>
         <ControlButton variant="outline" size="icon" onClick={onShowTutorial} tooltip="Help">
            <HelpCircle />
         </ControlButton>
      </div>
    </TooltipProvider>
  );
}
