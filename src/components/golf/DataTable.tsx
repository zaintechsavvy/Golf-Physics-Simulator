'use client';
import type { SimulationRun } from '@/lib/types';
import {
  Table,
  TableBody,
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
import { FileDown } from 'lucide-react';

type DataTableProps = {
  runs: SimulationRun[];
  onClear: () => void;
};

export default function DataTable({ runs, onClear }: DataTableProps) {
  const exportToCSV = () => {
    if (runs.length === 0) return;

    const headers = [
      "Run",
      "Angle (°)",
      "Velocity (m/s)",
      "Start Height (m)",
      "Gravity (m/s²)",
      "Mass (kg)",
      "Air Resistance",
      "Drag Coeff.",
      "Flight Time (s)",
      "Max Height (m)",
      "Distance (m)",
      "Impact Speed (m/s)",
    ];

    const rows = runs.map((run, index) => [
      index + 1,
      run.params.angle.toFixed(1),
      run.params.initialVelocity.toFixed(2),
      run.params.startHeight.toFixed(1),
      run.params.gravity.toFixed(2),
      run.params.mass.toFixed(3),
      run.params.airResistance ? 'On' : 'Off',
      run.params.airResistance ? run.params.dragCoefficient.toFixed(2) : 'N/A',
      run.stats.flightTime.toFixed(2),
      run.stats.maxHeight.toFixed(2),
      run.stats.horizontalDistance.toFixed(2),
      run.stats.impactSpeed.toFixed(2),
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "golf_simulation_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Simulation Data</DialogTitle>
        <DialogDescription>
          A log of all your stored simulation runs. Export your data to CSV.
        </DialogDescription>
      </DialogHeader>
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={exportToCSV} disabled={runs.length === 0}>
          <FileDown className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
        <Button variant="outline" size="sm" onClick={onClear} disabled={runs.length === 0}>
          Clear Data
        </Button>
      </div>
      <ScrollArea className="h-96 w-full border rounded-md mt-4">
        <Table>
          <TableHeader className="sticky top-0 bg-secondary">
            <TableRow>
              <TableHead className="w-[50px]">Run</TableHead>
              <TableHead>Angle</TableHead>
              <TableHead>Velocity</TableHead>
              <TableHead>Start H.</TableHead>
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
                <TableCell colSpan={11} className="h-24 text-center">
                  No data stored yet. Complete a simulation and click 'Store Run'.
                </TableCell>
              </TableRow>
            ) : (
              runs.map((run, index) => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{run.params.angle.toFixed(1)}°</TableCell>
                  <TableCell>{run.params.initialVelocity.toFixed(2)} m/s</TableCell>
                  <TableCell>{run.params.startHeight.toFixed(1)} m</TableCell>
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
