// (admin)/customers/new/_components/form-date-input.tsx

'use client';

import { ControllerRenderProps } from "react-hook-form";
import { FullApplicationFormData } from "../../schemas";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import InputMask from "react-input-mask";
import { useState, useEffect } from "react";

// Definimos un tipo para las props del campo que vienen de react-hook-form
type DateField = ControllerRenderProps<FullApplicationFormData, any>;

interface Props {
  field: DateField;
}

// Función auxiliar para formatear la fecha en UTC y evitar el error del día anterior
const formatDateUTC = (date: Date | null | undefined): string => {
  if (!date || !isValid(date)) return '';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export default function FormDateInput({ field }: Props) {
  const [inputValue, setInputValue] = useState(formatDateUTC(field.value));

  useEffect(() => {
    setInputValue(formatDateUTC(field.value));
  }, [field.value]);

  return (
    <div className="flex items-center gap-2">
      <InputMask
        mask="99/99/9999"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={() => {
          const parsedDate = parse(inputValue, 'dd/MM/yyyy', new Date());
          if (isValid(parsedDate)) {
            const utcDate = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));
            field.onChange(utcDate);
          } else {
            field.onChange(undefined);
          }
        }}
      >
        {(inputProps) => <Input {...inputProps} placeholder="DD/MM/AAAA" />}
      </InputMask>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={field.value}
            onSelect={(date) => field.onChange(date)}
            captionLayout="dropdown-buttons"
            fromYear={1920}
            toYear={new Date().getFullYear()}
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}