'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { memberFetch } from '@/lib/member-api';

interface Product {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image: string | null;
  available: boolean;
  value: number | null;
}

interface CatalogResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  showProductValues: boolean;
}

export default function MemberCatalogPage() {
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const fetchCatalog = useCallback(
    (p: number) => {
      setLoading(true);
      setError(null);
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      memberFetch<CatalogResponse>(`/member-app/catalog?page=${p}&limit=${limit}${searchParam}`)
        .then((res) => {
          setData(res);
          setPage(p);
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar catalogo'))
        .finally(() => setLoading(false));
    },
    [search],
  );

  useEffect(() => {
    fetchCatalog(1);
  }, [fetchCatalog]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-[#15140F]">Catalogo</h1>
        <p className="text-sm text-[#7A7770]">Productos disponibles en el club</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3 text-[#A8A5A0]" />
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') fetchCatalog(1);
          }}
          className="h-10 w-full rounded-xl border border-[#E0DDD4] bg-white pl-10 pr-4 text-sm text-[#15140F] outline-none transition placeholder:text-[#A8A5A0] focus:border-[#15140F] focus:ring-4 focus:ring-[#FFE600]/20"
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-[#E0DDD4]" />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <p className="text-sm text-[#7A7770]">{error}</p>
          <button
            onClick={() => fetchCatalog(page)}
            className="rounded-lg bg-[#15140F] px-4 py-2 text-sm font-medium text-[#FAF8F2]"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Empty state */}
      {data && data.items.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2EFE6]">
            <Package size={24} className="text-[#A8A5A0]" />
          </div>
          <p className="text-sm text-[#7A7770]">No se encontraron productos</p>
        </div>
      )}

      {/* Product grid */}
      {data && data.items.length > 0 && !loading && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {data.items.map((product) => (
              <div
                key={product.id}
                className="flex flex-col overflow-hidden rounded-xl border border-[#E0DDD4] bg-white shadow-sm"
              >
                {/* Image placeholder */}
                <div className="flex h-28 items-center justify-center bg-[#F2EFE6]">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package size={28} className="text-[#A8A5A0]" />
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  {/* Category */}
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#7A7770]">
                    {product.category}
                  </span>

                  {/* Name */}
                  <h3 className="text-sm font-semibold leading-tight text-[#15140F]">
                    {product.name}
                  </h3>

                  {/* Description */}
                  {product.description && (
                    <p className="line-clamp-2 text-xs text-[#7A7770]">
                      {product.description}
                    </p>
                  )}

                  {/* Value */}
                  {data.showProductValues && product.value != null && (
                    <div className="mt-1 text-sm font-bold text-[#15140F]">
                      {product.value.toLocaleString('es-ES', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      <span className="text-xs font-normal text-[#7A7770]">CR</span>
                    </div>
                  )}

                  {/* Availability badge */}
                  <div className="mt-auto pt-2">
                    {product.available ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                        Disponible para dispensacion
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        No disponible actualmente
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between py-2">
              <button
                onClick={() => fetchCatalog(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-[#E0DDD4] bg-white px-3 py-2 text-xs font-medium text-[#15140F] transition hover:bg-[#F2EFE6] disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
              <span className="text-xs text-[#7A7770]">
                {page} / {data.totalPages}
              </span>
              <button
                onClick={() => fetchCatalog(page + 1)}
                disabled={page >= data.totalPages}
                className="flex items-center gap-1 rounded-lg border border-[#E0DDD4] bg-white px-3 py-2 text-xs font-medium text-[#15140F] transition hover:bg-[#F2EFE6] disabled:opacity-40"
              >
                Siguiente
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
