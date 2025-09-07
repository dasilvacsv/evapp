'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { getBranches, createBranchAndClient } from '@/features/branches/actions';

type Branch = {
  id: number;
  name: string;
};

interface BranchComboboxProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

export function BranchCombobox({ value, onChange }: BranchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const fetchBranches = async () => {
      const result = await getBranches();
      if (result.success && result.data) {
        setBranches(result.data);
      }
    };
    fetchBranches();
  }, []);

  const callCreateBranchAction = async (formData: FormData) => {
    setIsSubmitting(true);
    const result = await createBranchAndClient(formData);
    setIsSubmitting(false);

    if (result.success && result.data) {
      toast({ title: 'Éxito', description: 'Nueva sucursal creada.' });
      const newBranch = result.data;

      setBranches((prev) => [...prev, newBranch]);
      onChange(newBranch.id);
      setIsDialogOpen(false);
      setOpen(false);
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    callCreateBranchAction(formData);
  };

  const selectedBranch = branches.find((branch) => branch.id === value);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12 bg-white/50 border-slate-200"
          >
            {selectedBranch
              ? selectedBranch.name
              : 'Selecciona una sucursal...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Buscar sucursal..." />
            <CommandList>
              <CommandEmpty>No se encontró la sucursal.</CommandEmpty>
              <CommandGroup>
                {branches.map((branch) => (
                  <CommandItem
                    key={branch.id}
                    value={branch.name}
                    onSelect={() => {
                      onChange(branch.id === value ? undefined : branch.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === branch.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {branch.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setIsDialogOpen(true);
                  }}
                  className="text-blue-600 cursor-pointer"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear nueva sucursal
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear Nueva Sucursal</DialogTitle>
            <DialogDescription>
              Esto también creará una nueva compañía a la que pertenecerá esta sucursal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="companyName" className="text-right">Compañía</Label>
              <Input id="companyName" name="companyName" className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="branchName" className="text-right">Nombre Sucursal</Label>
              <Input id="branchName" name="branchName" className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">Dirección</Label>
              <Input id="address" name="address" className="col-span-3" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creando...' : 'Crear y Seleccionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}