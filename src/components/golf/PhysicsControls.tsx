'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { PhysicsState } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from 'react';
import { Separator } from '../ui/separator';

type PhysicsControlsProps = {
  params: PhysicsState;
  onParamChange: (newParams: Partial<PhysicsState>) => void;
  isSimulating: boolean;
  obstaclesEnabled: boolean;
  onObstaclesToggle: (enabled: boolean) => void;
};

const GRAVITY_PRESETS = {
  'Earth': 9.807,
  'Moon': 1.62,
  'Mars': 3.721,
  'Custom': -1,
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
  precision = 2,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  disabled: boolean;
  precision?: number;
}) => (
  <div className="grid gap-2">
    <div className="flex justify-between items-center">
      <Label htmlFor={label.toLowerCase().replace(/ /g, '-')}>{label}</Label>
      <span className="text-sm font-medium text-muted-foreground w-28 text-right">
        {value.toFixed(precision)} {unit}
      </span>
    </div>
    <Slider
      id={label.toLowerCase().replace(/ /g, '-')}
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => onChange(v)}
      disabled={disabled}
    />
  </div>
);

export default function PhysicsControls({ 
  params, 
  onParamChange, 
  isSimulating,
  obstaclesEnabled,
  onObstaclesToggle,
}: PhysicsControlsProps) {
  const [gravitySelection, setGravitySelection] = useState('Earth');

  const handleGravityChange = (selection: string) => {
    setGravitySelection(selection);
    if (selection !== 'Custom') {
      onParamChange({ gravity: GRAVITY_PRESETS[selection as keyof typeof GRAVITY_PRESETS] });
    }
  };
  
  return (
    <Card className="w-80 shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Physics Controls</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <SliderControl
          label="Initial Velocity"
          value={params.initialVelocity}
          min={1}
          max={70}
          step={1}
          unit="m/s"
          onChange={(v) => onParamChange({ initialVelocity: v })}
          disabled={isSimulating}
        />
        
        <SliderControl
          label="Start Height"
          value={params.startHeight}
          min={0}
          max={50}
          step={1}
          unit="m"
          onChange={(v) => onParamChange({ startHeight: v })}
          disabled={isSimulating}
          precision={0}
        />

        <div className="grid gap-3">
          <Label>Gravity</Label>
           <Select onValueChange={handleGravityChange} defaultValue="Earth" disabled={isSimulating}>
            <SelectTrigger>
              <SelectValue placeholder="Select a planet" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GRAVITY_PRESETS).map(([name, value]) => (
                <SelectItem key={name} value={name}>
                  {name}
                  {name !== 'Custom' && ` (${value.toFixed(2)} m/s²)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {gravitySelection === 'Custom' && (
            <SliderControl
              label="Custom Gravity"
              value={params.gravity}
              min={1}
              max={25}
              step={0.1}
              unit="m/s²"
              onChange={(v) => onParamChange({ gravity: v })}
              disabled={isSimulating}
            />
          )}
        </div>


        <SliderControl
          label="Golf Ball Mass"
          value={params.mass}
          min={0.01}
          max={0.1}
          step={0.001}
          unit="kg"
          onChange={(v) => onParamChange({ mass: v })}
          disabled={isSimulating}
          precision={3}
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

        <Separator />
        
        <div className="flex items-center justify-between">
            <Label htmlFor="obstacles-enabled">Enable Obstacles</Label>
            <Switch
              id="obstacles-enabled"
              checked={obstaclesEnabled}
              onCheckedChange={onObstaclesToggle}
              disabled={isSimulating}
            />
          </div>

      </CardContent>
    </Card>
  );
}

    