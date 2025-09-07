// src/app/commissions/page.tsx

'use client'; 

import { useState, useEffect } from 'react';
import { getCommissionablePolicies, getCommissionBatches, getCommissionStats } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Calculator, DollarSign, Clock, CheckCircle, ArrowRight, Wallet, TrendingUp } from 'lucide-react';
// Asegúrate de que este componente acepte `policies` y `selectedPolicies`
import CommissionCalculator from './components/commission-calculator'; 

interface Policy {
  id: string;
  customerName: string;
  agentName: string;
  insuranceCompany: string;
  monthlyPremium: number;
}

interface Batch {
  id: string;
  periodDescription: string;
  status: string;
  recordCount: number;
  createdByName: string;
  totalAmount: number;
  createdAt: string;
}

interface Stats {
  totalCommissions: number;
  pendingCommissions: number;
  batchStatusCounts: { status: string; count: number }[];
}

interface PageProps {
  searchParams: {
    page?: string;
    search?: string;
  };
}

const getBatchStatusColor = (status: string) => {
  const colors = {
    'pending_approval': 'bg-yellow-500 text-yellow-50 hover:bg-yellow-600',
    'approved': 'bg-green-600 text-green-50 hover:bg-green-700',
    'paid': 'bg-blue-600 text-blue-50 hover:bg-blue-700',
  };
  return colors[status as keyof typeof colors] || 'bg-gray-500 text-gray-50 hover:bg-gray-600';
};

export default function CommissionsPage({ searchParams }: PageProps) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || '';
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPolicies, setSelectedPolicies] = useState<Policy[]>([]);
  const [allSelected, setAllSelected] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [policiesData, batchesData, statsData] = await Promise.all([
        getCommissionablePolicies(page, 50, search),
        getCommissionBatches(1, 10),
        getCommissionStats(),
      ]);
      setPolicies(policiesData.policies);
      setBatches(batchesData.batches);
      setStats(statsData);
      setIsLoading(false);
    };
    fetchData();
  }, [page, search]);

  const handleSelectPolicy = (policy: Policy, isChecked: boolean) => {
    setSelectedPolicies(prev => 
      isChecked ? [...prev, policy] : prev.filter(p => p.id !== policy.id)
    );
  };

  const handleSelectAll = (isChecked: boolean) => {
    setAllSelected(isChecked);
    setSelectedPolicies(isChecked ? policies : []);
  };

  const isPolicySelected = (policyId: string) => selectedPolicies.some(p => p.id === policyId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl text-gray-500">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Encabezado y Descripción */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tighter text-gray-900">Gestión de Comisiones 💰</h1>
        <p className="mt-2 text-lg text-gray-600 max-w-2xl">
          Administra y calcula las comisiones de los agentes. Revisa las pólizas elegibles, crea nuevos lotes de pago y monitorea el estado de las transacciones.
        </p>
      </div>

      <hr className="border-t border-gray-200" />

      {/* Tarjetas de Estadísticas (KPIs) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-md transition-transform transform hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Comisiones Totales</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {formatCurrency(Number(stats?.totalCommissions))}
            </div>
            <p className="text-xs text-green-500 mt-1">Acumulado hasta la fecha</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-md transition-transform transform hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Comisiones por Calcular</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">{stats?.pendingCommissions}</div>
            <p className="text-xs text-orange-500 mt-1">Pólizas elegibles</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-md transition-transform transform hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Lotes Aprobados</CardTitle>
            <CheckCircle className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {stats?.batchStatusCounts.find(s => s.status === 'approved')?.count || 0}
            </div>
            <p className="text-xs text-blue-500 mt-1">Listos para pago</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-md transition-transform transform hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Lotes Pagados</CardTitle>
            <Wallet className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              {stats?.batchStatusCounts.find(s => s.status === 'paid')?.count || 0}
            </div>
            <p className="text-xs text-purple-500 mt-1">Transacciones completadas</p>
          </CardContent>
        </Card>
      </div>

      <hr className="border-t border-gray-200" />

      {/* Contenido Principal con Tabs */}
      <Tabs defaultValue="policies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="policies">Pólizas para Comisión</TabsTrigger>
          <TabsTrigger value="batches">Historial de Lotes</TabsTrigger>
        </TabsList>

        {/* Tab - Pólizas Elegibles */}
        <TabsContent value="policies" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Pólizas Elegibles</h2>
              <p className="text-sm text-gray-500 mt-1">
                Selecciona las pólizas que deseas incluir en un nuevo lote de comisiones.
              </p>
            </div>
            {/* Aquí pasamos la lista de pólizas y las seleccionadas */}
            <CommissionCalculator policies={policies} selectedPolicies={selectedPolicies} />
          </div>

          <Card className="shadow-lg border-gray-100">
            <CardHeader className="bg-gray-50 rounded-t-lg p-4">
              <CardTitle className="flex items-center text-lg font-semibold text-gray-800">
                <Calculator className="mr-2 h-5 w-5 text-gray-600" />
                Pólizas para Calcular Comisión ({selectedPolicies.length} seleccionadas)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {policies.length === 0 ? (
                <p className="text-center py-12 text-gray-400 font-medium">
                  🎉 ¡Todo al día! No hay pólizas elegibles para el cálculo de comisiones.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"><Checkbox checked={allSelected} onCheckedChange={(checked) => handleSelectAll(checked as boolean)} /></TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Agente</TableHead>
                      <TableHead>Compañía</TableHead>
                      <TableHead className="text-right">Prima Mensual</TableHead>
                      <TableHead className="text-right">Comisión Estimada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map((policy) => (
                      <TableRow key={policy.id} className={isPolicySelected(policy.id) ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"}>
                        <TableCell><Checkbox checked={isPolicySelected(policy.id)} onCheckedChange={(checked) => handleSelectPolicy(policy, checked as boolean)} /></TableCell>
                        <TableCell className="font-medium text-gray-900">{policy.customerName}</TableCell>
                        <TableCell>{policy.agentName}</TableCell>
                        <TableCell>{policy.insuranceCompany}</TableCell>
                        <TableCell className="text-right font-semibold text-gray-700">{formatCurrency(Number(policy.monthlyPremium))}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(Number(policy.monthlyPremium) * 0.1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab - Lotes de Comisión */}
        <TabsContent value="batches" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Historial de Lotes</h2>
              <p className="text-sm text-gray-500 mt-1">Revisa el estado de todos los lotes de pago de comisiones.</p>
            </div>
          </div>

          <Card className="shadow-lg border-gray-100">
            <CardHeader className="bg-gray-50 rounded-t-lg p-4">
              <CardTitle className="flex items-center text-lg font-semibold text-gray-800">
                <DollarSign className="mr-2 h-5 w-5 text-gray-600" />
                Lotes de Comisión Recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {batches.length === 0 ? (
                <p className="text-center py-12 text-gray-400 font-medium">
                  No se encontraron lotes de comisiones. ¡Comienza creando uno!
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead>Creado Por</TableHead>
                      <TableHead className="text-right">Monto Total</TableHead>
                      <TableHead className="text-right">Fecha de Creación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => (
                      <TableRow key={batch.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-gray-900">{batch.periodDescription}</TableCell>
                        <TableCell>
                          <Badge className={`${getBatchStatusColor(batch.status)} text-xs font-semibold px-2 py-1 rounded-full`}>
                            {batch.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{batch.recordCount}</TableCell>
                        <TableCell>{batch.createdByName}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(Number(batch.totalAmount))}
                        </TableCell>
                        <TableCell className="text-right text-gray-500">
                          {formatDate(batch.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}