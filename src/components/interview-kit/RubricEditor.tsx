"use client";

import type { ClientRubricCriterion } from '@/types/interview-kit';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Scale } from 'lucide-react';
import type React from 'react';
import { useState, useEffect } from 'react';

interface RubricEditorProps {
  rubricCriteria: ClientRubricCriterion[];
  onRubricChange: (updatedRubric: ClientRubricCriterion[]) => void;
  isLoading?: boolean;
}

export function RubricEditor({ rubricCriteria, onRubricChange, isLoading = false }: RubricEditorProps) {
  const [internalCriteria, setInternalCriteria] = useState<ClientRubricCriterion[]>(rubricCriteria);
  const [totalWeight, setTotalWeight] = useState(0);

  useEffect(() => {
    setInternalCriteria(rubricCriteria);
  }, [rubricCriteria]);

  useEffect(() => {
    const sum = internalCriteria.reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);
    setTotalWeight(parseFloat(sum.toFixed(2)));
  }, [internalCriteria]);

  const handleCriterionChange = (
    index: number,
    field: keyof ClientRubricCriterion,
    value: string | number
  ) => {
    const updatedCriteria = [...internalCriteria];
    if (field === 'weight') {
      const numValue = parseFloat(value as string);
      updatedCriteria[index] = { ...updatedCriteria[index], [field]: isNaN(numValue) ? 0 : Math.min(1, Math.max(0, numValue)) };
    } else {
      updatedCriteria[index] = { ...updatedCriteria[index], [field]: value };
    }
    setInternalCriteria(updatedCriteria);
    onRubricChange(updatedCriteria); // Propagate changes up immediately
  };
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <Scale className="mr-2 h-6 w-6 text-primary" aria-hidden="true" />
          Scoring Rubric
        </CardTitle>
        <CardDescription>
          Define the criteria and their weights for evaluation. Weights should sum to 1.0.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {internalCriteria.map((criterion, index) => (
          <div key={criterion.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border rounded-md bg-background/50">
            <div className="flex-grow w-full sm:w-auto">
              <Label htmlFor={`criterion-name-${criterion.id}`} className="font-medium">Criterion Name</Label>
              <Input
                id={`criterion-name-${criterion.id}`}
                value={criterion.name}
                onChange={(e) => handleCriterionChange(index, 'name', e.target.value)}
                placeholder="e.g., Technical Skills"
                className="mt-1 text-sm"
                disabled={isLoading}
                aria-label={`Criterion name for ${criterion.name || `criterion ${index + 1}`}`}
              />
            </div>
            <div className="w-full sm:w-32">
              <Label htmlFor={`criterion-weight-${criterion.id}`} className="font-medium">Weight</Label>
              <Input
                id={`criterion-weight-${criterion.id}`}
                type="number"
                value={criterion.weight}
                onChange={(e) => handleCriterionChange(index, 'weight', e.target.value)}
                placeholder="e.g., 0.4"
                step="0.01"
                min="0"
                max="1"
                className="mt-1 text-sm"
                disabled={isLoading}
                aria-label={`Weight for ${criterion.name || `criterion ${index + 1}`}`}
              />
            </div>
          </div>
        ))}
         {internalCriteria.length === 0 && (
            <p className="text-muted-foreground text-sm py-2">No rubric criteria defined.</p>
        )}
        <div 
          className={`mt-4 p-3 rounded-md text-sm font-medium ${totalWeight === 1.0 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'}`}
          role="status" 
          aria-live="polite"
        >
          Total Weight: {totalWeight.toFixed(2)} / 1.00
          {totalWeight !== 1.0 && " (Weights should sum to 1.0)"}
        </div>
      </CardContent>
    </Card>
  );
}
