'use client';
import type { SimulationRun } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

type DataTableProps = {
  runs: SimulationRun[];
  onClear: () => void;
};

export default function DataTable({ runs, onClear }: DataTableProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Simulation Data</DialogTitle>
        <DialogDescription>
          A log of all your stored simulation runs.
        </DialogDescription>
      </DialogHeader>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onClear} disabled={runs.length === 0}>
          Clear Data
        </Button>
      </div>
      <ScrollArea className="h-96 w-full border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 bg-secondary">
            <TableRow>
              <TableHead className="w-[50px]">Run</TableHead>
              <TableHead>Angle</TableHead>
              <TableHead>Velocity</TableHead>
              <TableHead>Gravity</TableHead>
              <TableHead>Mass</TableHead>
              <TableHead>Drag Coeff.</TableHead>
              <TableHead>Flight Time</TableHead>
              <TableHead>Max Height</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Impact Speed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  No data stored yet. Complete a simulation and click 'Store Run'.
                </TableCell>
              </TableRow>
            ) : (
              runs.map((run, index) => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{run.params.angle.toFixed(1)}°</TableCell>
                  <TableCell>{run.params.initialVelocity.toFixed(2)} m/s</TableCell>
                  <TableCell>{run.params.gravity.toFixed(2)} m/s²</TableCell>
                  <TableCell>{run.params.mass.toFixed(3)} kg</TableCell>
                  <TableCell>{run.params.airResistance ? run.params.dragCoefficient.toFixed(2) : 'N/A'}</TableCell>
                  <TableCell>{run.stats.flightTime.toFixed(2)}s</TableCell>
                  <TableCell>{run.stats.maxHeight.toFixed(2)}m</TableCell>
                  <TableCell>{run.stats.horizontalDistance.toFixed(2)}m</TableCell>
                  <TableCell>{run.stats.impactSpeed.toFixed(2)} m/s</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </>
  );
}
