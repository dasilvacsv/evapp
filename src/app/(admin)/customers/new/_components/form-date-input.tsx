'use client';

import { ControllerRenderProps } from "react-hook-form";
import { FullApplicationFormData } from "../../schemas";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { isValid, parse, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";

type DateField = ControllerRenderProps<FullApplicationFormData, any>;

interface Props {
  field: DateField;
  disabled?: boolean;
}

// Función auxiliar para formatear fecha en formato MM/DD/AAAA
const formatDateUS = (date: Date | null | undefined): string => {
  if (!date || !isValid(date)) return '';
  return format(date, 'MM/dd/yyyy');
};

export default function FormDateInput({ field, disabled = false }: Props) {
  const [inputValue, setInputValue] = useState(formatDateUS(field.value));

  useEffect(() => {
    setInputValue(formatDateUS(field.value));
  }, [field.value]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleInputBlur = () => {
    // Intentar parsear la fecha en formato MM/DD/AAAA
    const parsedDate = parse(inputValue, 'MM/dd/yyyy', new Date());
    if (isValid(parsedDate)) {
      // Crear fecha UTC para evitar problemas de zona horaria
      const utcDate = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));
      field.onChange(utcDate);
    } else {
      field.onChange(undefined);
      if (inputValue.trim() !== '') {
        // Si hay texto pero no es una fecha válida, limpiar el campo
        setInputValue('');
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="MM/DD/AAAA"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onBlur={handleInputBlur}
        disabled={disabled}
        maxLength={10}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 flex-shrink-0"
            disabled={disabled}
            type="button"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={field.value}
            onSelect={(date) => {
              field.onChange(date);
              if (date) {
                setInputValue(formatDateUS(date));
              }
            }}
            captionLayout="dropdown-buttons"
            fromYear={1920}
            toYear={new Date().getFullYear() + 10}
            disabled={(date) => disabled}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}