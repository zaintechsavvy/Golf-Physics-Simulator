'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

type AngleControlProps = {
  angle: number;
  onAngleChange: (angle: number) => void;
  disabled: boolean;
};

export default function AngleControl({ angle, onAngleChange, disabled }: AngleControlProps) {
  return (
    <Card className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-80 w-24 shadow-lg bg-primary/20 backdrop-blur-sm">
      <CardContent className="h-full flex flex-col items-center justify-center p-2 gap-2">
        <Label htmlFor="launch-angle" className="text-center text-primary-foreground">
          Launch Angle
        </Label>
        <div className="flex-1 flex items-center justify-center py-4">
          <Slider
            id="launch-angle"
            orientation="vertical"
            value={[angle]}
            min={0}
            max={90}
            step={1}
            onValueChange={([v]) => onAngleChange(v)}
            disabled={disabled}
            className="h-full"
          />
        </div>
        <span className="font-semibold text-lg text-primary-foreground">{angle.toFixed(0)}°</span>
      </CardContent>
    </Card>
  );
}
