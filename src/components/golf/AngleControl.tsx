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
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
      <Card className="bg-card/80 backdrop-blur-sm shadow-lg">
        <CardContent className="p-4">
          <div className="grid gap-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="angle-slider" className="font-semibold">Launch Angle</Label>
              <span className="text-lg font-bold text-foreground w-24 text-center tabular-nums">
                {angle.toFixed(1)}°
              </span>
            </div>
            <Slider
              id="angle-slider"
              value={[angle]}
              min={0}
              max={90}
              step={0.5}
              onValueChange={([v]) => onAngleChange(v)}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
