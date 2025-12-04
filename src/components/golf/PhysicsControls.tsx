'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { PhysicsState } from '@/lib/types';
import { cn } from '@/lib/utils';

type PhysicsControlsProps = {
  params: PhysicsState;
  onParamChange: (newParams: Partial<PhysicsState>) => void;
  isSimulating: boolean;
};

const SliderControl = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  disabled: boolean;
}) => (
  <div className="grid gap-2">
    <div className="flex justify-between items-center">
      <Label htmlFor={label.toLowerCase().replace(' ', '-')}>{label}</Label>
      <span className="text-sm font-medium text-muted-foreground w-28 text-right">
        {value.toFixed(2)} {unit}
      </span>
    </div>
    <Slider
      id={label.toLowerCase().replace(' ', '-')}
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => onChange(v)}
      disabled={disabled}
    />
  </div>
);

export default function PhysicsControls({ params, onParamChange, isSimulating }: PhysicsControlsProps) {
  return (
    <Card className="absolute top-4 right-4 z-10 w-80 shadow-lg">
      <CardHeader>
        <CardTitle>Physics Controls</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <SliderControl
          label="Launch Angle"
          value={params.angle}
          min={0}
          max={90}
          step={1}
          unit="°"
          onChange={(v) => onParamChange({ angle: v })}
          disabled={isSimulating}
        />
        <SliderControl
          label="Initial Velocity"
          value={params.initialVelocity}
          min={0}
          max={50}
          step={1}
          unit="m/s"
          onChange={(v) => onParamChange({ initialVelocity: v })}
          disabled={isSimulating}
        />
        <SliderControl
          label="Gravity"
          value={params.gravity}
          min={1}
          max={20}
          step={0.1}
          unit="m/s²"
          onChange={(v) => onParamChange({ gravity: v })}
          disabled={isSimulating}
        />
        <SliderControl
          label="Ball Mass"
          value={params.mass}
          min={0.01}
          max={0.1}
          step={0.001}
          unit="kg"
          onChange={(v) => onParamChange({ mass: v })}
          disabled={isSimulating}
        />
        <SliderControl
          label="Ball Diameter"
          value={params.diameter}
          min={0.02}
          max={0.05}
          step={0.001}
          unit="m"
          onChange={(v) => onParamChange({ diameter: v })}
          disabled={isSimulating}
        />
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="air-resistance">Air Resistance</Label>
            <Switch
              id="air-resistance"
              checked={params.airResistance}
              onCheckedChange={(c) => onParamChange({ airResistance: c })}
              disabled={isSimulating}
            />
          </div>
          <div className={cn('grid gap-2 transition-opacity', { 'opacity-50': !params.airResistance })}>
            <SliderControl
              label="Drag Coefficient"
              value={params.dragCoefficient}
              min={0}
              max={1}
              step={0.01}
              unit=""
              onChange={(v) => onParamChange({ dragCoefficient: v })}
              disabled={isSimulating || !params.airResistance}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
