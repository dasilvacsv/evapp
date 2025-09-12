'use client';

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValid, parse } from "date-fns";

interface BirthDateFieldsProps {
  value?: Date;
  onChange: (date?: Date) => void;
}

const months = [
  { value: '0', label: 'Enero' }, { value: '1', label: 'Febrero' }, { value: '2', label: 'Marzo' },
  { value: '3', label: 'Abril' }, { value: '4', label: 'Mayo' }, { value: '5', label: 'Junio' },
  { value: '6', label: 'Julio' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Septiembre' },
  { value: '9', label: 'Octubre' }, { value: '10', label: 'Noviembre' }, { value: '11', label: 'Diciembre' }
];

export default function BirthDateFields({ value, onChange }: BirthDateFieldsProps) {
  const [day, setDay] = useState(() => value ? String(value.getUTCDate()) : '');
  const [month, setMonth] = useState(() => value ? String(value.getUTCMonth()) : '');
  const [year, setYear] = useState(() => value ? String(value.getUTCFullYear()) : '');

  useEffect(() => {
    if (day && month && year && year.length === 4) {
      const dayInt = parseInt(day, 10);
      const yearInt = parseInt(year, 10);
      const monthInt = parseInt(month, 10);
      
      const potentialDate = new Date(Date.UTC(yearInt, monthInt, dayInt));
      
      // Validamos que la fecha construida es válida y corresponde a los inputs
      if (isValid(potentialDate) && potentialDate.getUTCFullYear() === yearInt && potentialDate.getUTCMonth() === monthInt && potentialDate.getUTCDate() === dayInt) {
        onChange(potentialDate);
      } else {
        onChange(undefined);
      }
    } else {
      onChange(undefined);
    }
  }, [day, month, year, onChange]);
  
  return (
    <div className="flex items-center gap-2">
      <Select value={month} onValueChange={setMonth}>
        <SelectTrigger><SelectValue placeholder="Mes" /></SelectTrigger>
        <SelectContent>
          {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input
        type="number"
        placeholder="Día"
        value={day}
        onChange={(e) => setDay(e.target.value)}
        min={1} max={31}
      />
      <Input
        type="number"
        placeholder="Año"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        min={1920}
        max={new Date().getFullYear()}
      />
    </div>
  );
}