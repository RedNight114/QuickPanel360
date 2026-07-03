import { ShieldCheck, UserCheck, UserCog, Users, UserX } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import type { Employee } from '@/lib/types';
import { formatEmployeeDateTime } from './employee-utils';

export function EmployeeKpiGrid({ employees }: { employees: Employee[] }) {
  const active = employees.filter((employee) => employee.status === 'ACTIVE').length;
  const inactive = employees.filter((employee) =>
    ['INACTIVE', 'BLOCKED'].includes(employee.status),
  ).length;
  const managers = employees.filter((employee) => employee.role === 'MANAGER').length;
  const lastLogin = employees
    .map((employee) => employee.lastLoginAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b ?? 0).getTime() - new Date(a ?? 0).getTime())[0];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard title="Total colaboradores" value={employees.length} icon={<Users size={18} />} tone="blue" />
      <StatCard title="Activos" value={active} icon={<UserCheck size={18} />} tone="green" />
      <StatCard title="Inactivos/Bloqueados" value={inactive} icon={<UserX size={18} />} tone="red" />
      <StatCard title="Managers" value={managers} icon={<UserCog size={18} />} tone="amber" />
      <StatCard
        title="Último acceso reciente"
        value={<span className="text-lg">{formatEmployeeDateTime(lastLogin)}</span>}
        icon={<ShieldCheck size={18} />}
        tone="neutral"
      />
    </div>
  );
}

