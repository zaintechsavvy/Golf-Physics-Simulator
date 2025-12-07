'use client';
import type { SimulationStats, SimulationStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { forwardRef } from 'react';

type DataOverlayProps = {
  stats: SimulationStats;
  status: SimulationStatus;
};

const DataItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline gap-2">
    <span className="text-sm font-medium text-muted-foreground">{label}:</span>
    <span className="text-lg font-semibold text-foreground">{value}</span>
  </div>
);

const DataOverlay = forwardRef<HTMLDivElement, DataOverlayProps>(({ stats, status }, ref) => {
  return (
    <Card ref={ref} className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-auto shadow-lg bg-card/80 backdrop-blur-sm">
      <CardContent className="p-3">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <DataItem label="Flight Time" value={`${stats.flightTime.toFixed(2)}s`} />
          <DataItem label="Distance" value={`${stats.horizontalDistance.toFixed(2)}m`} />
          <DataItem label="Max Height" value={`${stats.maxHeight.toFixed(2)}m`} />
          <DataItem label="Launch Speed" value={`${stats.launchSpeed.toFixed(2)}m/s`} />
          {(status === 'finished' || stats.impactSpeed > 0) && (
            <DataItem label="Impact Speed" value={`${stats.impactSpeed.toFixed(2)}m/s`} />
          )}
        </div>
      </CardContent>
    </Card>
  );
});
DataOverlay.displayName = 'DataOverlay';

export default DataOverlay;