
"use client";

import type { ClientRubricCriterion } from '@/types/interview-kit';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Scale, CheckCircle2, AlertTriangle } from 'lucide-react';
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
    onRubricChange(updatedCriteria); 
  };
  
  return (
    <Card className="shadow-xl border border-accent/20">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-accent flex items-center">
          <Scale className="mr-3 h-7 w-7" aria-hidden="true" />
          Define Scoring Rubric
        </CardTitle>
        <CardDescription className="text-base">
          Set the criteria and their respective weights for candidate evaluation. All weights should sum to 1.0.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-3">
        {internalCriteria.map((criterion, index) => (
          <div key={criterion.id} className="space-y-3 p-4 border rounded-lg bg-background/50 shadow-sm">
            <div className="space-y-1.5">
              <Label htmlFor={`criterion-name-${criterion.id}`} className="font-medium text-sm text-foreground">Criterion Name</Label>
              <Input
                id={`criterion-name-${criterion.id}`}
                value={criterion.name}
                onChange={(e) => handleCriterionChange(index, 'name', e.target.value)}
                placeholder="e.g., Technical Proficiency, Problem Solving"
                className="mt-1 text-sm p-2 shadow-sm w-full"
                disabled={isLoading}
                aria-label={`Criterion name for ${criterion.name || `criterion ${index + 1}`}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`criterion-weight-${criterion.id}`} className="font-medium text-sm text-foreground">Weight (0.0 - 1.0)</Label>
              <Input
                id={`criterion-weight-${criterion.id}`}
                type="number"
                value={criterion.weight}
                onChange={(e) => handleCriterionChange(index, 'weight', e.target.value)}
                placeholder="e.g., 0.4"
                step="0.01"
                min="0"
                max="1"
                className="mt-1 text-sm p-2 shadow-sm w-full"
                disabled={isLoading}
                aria-label={`Weight for ${criterion.name || `criterion ${index + 1}`}`}
              />
            </div>
          </div>
        ))}
         {internalCriteria.length === 0 && (
            <p className="text-muted-foreground text-sm py-3 text-center">No rubric criteria defined yet.</p>
        )}
        <div 
          className={`mt-5 p-3.5 rounded-md text-md font-semibold flex items-center justify-center shadow ${totalWeight === 1.0 ? 'bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 border border-green-500/30' : 'bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300 border border-red-500/30'}`}
          role="status" 
          aria-live="polite"
        >
          {totalWeight === 1.0 ? <CheckCircle2 className="mr-2 h-5 w-5" /> : <AlertTriangle className="mr-2 h-5 w-5" />}
          Total Weight: {totalWeight.toFixed(2)} / 1.0
          {totalWeight !== 1.0 && " (Adjust weights to sum to 1.0)"}
        </div>
      </CardContent>
    </Card>
  );
}
