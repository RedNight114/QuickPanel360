'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Layers, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { ListSkeleton } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import {
  useArchivePlatformModule,
  useCreatePlatformModule,
  usePlatformModules,
  useUpdatePlatformModule,
} from '@/hooks/usePlatform';
import { getErrorMessage } from '@/lib/errors';
import type { CreatePlatformModuleInput, PlatformModuleDefinition } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

const emptyForm: CreatePlatformModuleInput = {
  key: '',
  name: '',
  description: '',
  category: 'Operativa',
  sortOrder: 0,
};

function moduleForm(module: PlatformModuleDefinition): CreatePlatformModuleInput {
  return {
    key: module.key,
    name: module.name,
    description: module.description ?? '',
    category: module.category,
    sortOrder: module.sortOrder,
  };
}

export default function PlatformModulesPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const allowed = hasRole('SUPERADMIN');
  const modulesQuery = usePlatformModules({ enabled: allowed });
  const createModule = useCreatePlatformModule();
  const updateModule = useUpdatePlatformModule();
  const archiveModule = useArchivePlatformModule();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformModuleDefinition | null>(null);
  const [form, setForm] = useState<CreatePlatformModuleInput>(emptyForm);
  const [confirmArchive, setConfirmArchive] = useState<PlatformModuleDefinition | null>(null);

  useEffect(() => {
    if (!allowed) router.replace('/dashboard');
  }, [allowed, router]);

  const modules = useMemo(() => modulesQuery.data ?? [], [modulesQuery.data]);
  const activeModules = modules.filter((module) => module.status === 'ACTIVE');
  const archivedModules = modules.filter((module) => module.status === 'ARCHIVED');
  const categories = new Set(modules.map((module) => module.category));
  const saving = createModule.isPending || updateModule.isPending || archiveModule.isPending;

  if (!allowed) return null;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(module: PlatformModuleDefinition) {
    setEditing(module);
    setForm(moduleForm(module));
    setFormOpen(true);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.key.trim() || !form.name.trim()) {
      toast.error('Clave y nombre son obligatorios');
      return;
    }

    const body = {
      ...form,
      key: form.key.trim().toLowerCase(),
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      category: form.category?.trim() || 'Operativa',
      sortOrder: Number(form.sortOrder ?? 0),
    };

    try {
      if (editing) {
        await updateModule.mutateAsync({ id: editing.id, body });
        toast.success('Módulo actualizado');
      } else {
        await createModule.mutateAsync(body);
        toast.success('Módulo creado');
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar el módulo'));
    }
  }

  async function runArchive() {
    if (!confirmArchive) return;

    try {
      await archiveModule.mutateAsync(confirmArchive.id);
      toast.success('Módulo archivado');
      setConfirmArchive(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo archivar el módulo'));
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Módulos"
          description="Administra el catálogo global de módulos disponibles para planes y empresas."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} />
              Nuevo módulo
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Módulos activos" value={activeModules.length} icon={<Layers size={18} />} tone="green" />
          <StatCard title="Archivados" value={archivedModules.length} icon={<Archive size={18} />} tone="amber" />
          <StatCard title="Categorías" value={categories.size} icon={<Layers size={18} />} tone="blue" />
        </div>

        <section className="space-y-4">
          {modulesQuery.isLoading ? <ListSkeleton rows={4} /> : null}
          {!modulesQuery.isLoading && modules.length === 0 ? <EmptyState title="Sin módulos configurados" /> : null}
          {Array.from(categories).map((category) => (
            <Card key={category} className="p-5">
              <h2 className="text-lg font-semibold text-text-primary">{category}</h2>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {modules
                  .filter((module) => module.category === category)
                  .map((module) => (
                    <div key={module.id} className="rounded-xl border border-border-light bg-white p-4 shadow-card">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-text-primary">{module.name}</p>
                            <Badge variant={module.status === 'ACTIVE' ? 'success' : 'warning'}>
                              {module.status === 'ACTIVE' ? 'Activo' : 'Archivado'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-text-muted">
                            {module.key} · Orden {module.sortOrder}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(module)}>
                            <Pencil size={14} />
                            Editar
                          </Button>
                          {module.status !== 'ARCHIVED' ? (
                            <Button variant="outline" size="sm" onClick={() => setConfirmArchive(module)}>
                              <Archive size={14} />
                              Archivar
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-text-muted">
                        {module.description || 'Sin descripción'}
                      </p>
                    </div>
                  ))}
              </div>
            </Card>
          ))}
        </section>

        <Modal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title={editing ? 'Editar módulo' : 'Nuevo módulo'}
          description="Define un módulo comercial reutilizable en planes y tenants."
          size="lg"
          actions={
            <>
              <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" form="platform-module-form" disabled={saving}>
                Guardar módulo
              </Button>
            </>
          }
        >
          <form id="platform-module-form" className="grid gap-4 md:grid-cols-2" onSubmit={submitForm}>
            <Field label="Clave" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required />
            <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Field label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Field label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Field label="Orden" type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          </form>
        </Modal>

        <Modal
          open={Boolean(confirmArchive)}
          onClose={() => setConfirmArchive(null)}
          title="Archivar módulo"
          description="El módulo dejará de estar disponible para nuevas configuraciones. No se borran datos."
          size="sm"
          actions={
            <>
              <Button variant="outline" onClick={() => setConfirmArchive(null)} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={runArchive} disabled={saving}>
                Archivar módulo
              </Button>
            </>
          }
        >
          <p className="font-medium text-text-primary">{confirmArchive?.name}</p>
        </Modal>
      </div>
    </ProtectedLayout>
  );
}
