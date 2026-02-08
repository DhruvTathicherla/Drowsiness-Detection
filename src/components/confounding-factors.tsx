"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BrainCircuit, Coffee, Wind, Annoyed } from "lucide-react";

const factors = [
  { id: "Had Coffee", label: "Had Coffee", icon: <Coffee className="w-5 h-5" /> },
  { id: "Allergies", label: "Allergies / Dry Eyes", icon: <Wind className="w-5 h-5" /> },
  { id: "Feeling Stressed", label: "Feeling Stressed", icon: <Annoyed className="w-5 h-5" /> },
];

interface ConfoundingFactorsProps {
  selectedFactors: string[];
  onFactorsChange: (factors: string[]) => void;
  disabled?: boolean;
}

export default function ConfoundingFactors({ selectedFactors, onFactorsChange, disabled }: ConfoundingFactorsProps) {
  
  const handleCheckedChange = (factorId: string, checked: boolean) => {
    if (checked) {
      onFactorsChange([...selectedFactors, factorId]);
    } else {
      onFactorsChange(selectedFactors.filter((id) => id !== factorId));
    }
  };

  return (
    <Card className={`shadow-lg transition-opacity ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
            <BrainCircuit className="text-primary"/>
            <span>Confounding Factors</span>
        </CardTitle>
        <CardDescription>
            Help the AI make a more accurate assessment by providing context.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {factors.map((factor) => (
          <div key={factor.id} className="flex items-center space-x-3 rounded-md border p-3 hover:bg-secondary/50 transition-colors">
            <Checkbox
              id={factor.id}
              checked={selectedFactors.includes(factor.id)}
              onCheckedChange={(checked) => handleCheckedChange(factor.id, !!checked)}
              disabled={disabled}
            />
            <Label htmlFor={factor.id} className="flex items-center gap-2 font-normal text-base cursor-pointer">
                {factor.icon}
                {factor.label}
            </Label>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
