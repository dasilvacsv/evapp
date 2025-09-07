// components/ui/CountryCodeSelector.tsx
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { countries, Country } from '@/lib/countries';
import { ChevronsUpDown } from 'lucide-react';

interface CountryCodeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CountryCodeSelector({ value, onChange, disabled }: CountryCodeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedCountry = countries.find(c => c.dial_code === value) || countries[0];

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(search.toLowerCase()) ||
    country.dial_code.includes(search)
  );

  const handleSelect = (country: Country) => {
    onChange(country.dial_code);
    setOpen(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[130px] justify-between h-12 bg-black/30 border-white/10 text-white rounded-r-none hover:bg-white/5 hover:text-white"
          disabled={disabled}
        >
          <span className="text-xl mr-2">{selectedCountry.flag}</span>
          {selectedCountry.dial_code}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle>Selecciona un país</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <Input
            placeholder="Buscar país..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 bg-zinc-800 border-zinc-600 focus:ring-amber-500"
          />
          <div className="max-h-[300px] overflow-y-auto">
            {filteredCountries.map((country) => (
              <div
                key={country.code}
                onClick={() => handleSelect(country)}
                className="flex items-center p-2 rounded-md cursor-pointer hover:bg-zinc-800"
              >
                <span className="text-2xl mr-3">{country.flag}</span>
                <span className="flex-grow">{country.name}</span>
                <span className="text-zinc-400">{country.dial_code}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}