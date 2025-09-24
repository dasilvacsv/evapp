// components/ui/date-field.tsx
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DateFieldProps {
  value: string; // Expected format: 'YYYY-MM-DD'
  onChange: (value: string) => void;
  disabled?: boolean;
}

const months = [
  { value: '01', label: '01 - Enero' },
  { value: '02', label: '02 - Febrero' },
  { value: '03', label: '03 - Marzo' },
  { value: '04', label: '04 - Abril' },
  { value: '05', label: '05 - Mayo' },
  { value: '06', label: '06 - Junio' },
  { value: '07', label: '07 - Julio' },
  { value: '08', label: '08 - Agosto' },
  { value: '09',label: '09 - Septiembre' },
  { value: '10', label: '10 - Octubre' },
  { value: '11', label: '11 - Noviembre' },
  { value: '12', label: '12 - Diciembre' },
];

export function DateField({ value, onChange, disabled }: DateFieldProps) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Cuando el valor externo cambia, actualizamos los campos internos
  useEffect(() => {
    if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = value.split('-');
      setYear(y);
      setMonth(m);
      setDay(d);
    } else {
      // Si el valor inicial no es válido o está vacío, reseteamos.
      const today = new Date();
      setDay(String(today.getDate()).padStart(2, '0'));
      setMonth(String(today.getMonth() + 1).padStart(2, '0'));
      setYear(String(today.getFullYear()));
    }
  }, [value]);

  // Cuando un campo interno cambia, notificamos al padre con el formato 'YYYY-MM-DD'
  useEffect(() => {
    if (day && month && year.length === 4) {
      const newDate = `${year}-${month}-${day}`;
      // Solo notificar si el valor realmente cambió
      if (newDate !== value) {
        onChange(newDate);
      }
    }
  }, [day, month, year, onChange, value]);

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 2) {
      setDay(val.padStart(2, '0'));
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 4) {
      setYear(val);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Select value={month} onValueChange={setMonth} disabled={disabled}>
        <SelectTrigger id="month" aria-label="Mes">
          <SelectValue placeholder="Mes" />
        </SelectTrigger>
        <SelectContent>
          {months.map(m => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id="day"
        type="number"
        placeholder="DD"
        value={day}
        onChange={handleDayChange}
        disabled={disabled}
        className="w-20 text-center"
        aria-label="Día"
      />
      <Input
        id="year"
        type="number"
        placeholder="YYYY"
        value={year}
        onChange={handleYearChange}
        disabled={disabled}
        className="w-24 text-center"
        aria-label="Año"
      />
    </div>
  );
}