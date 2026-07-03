'use client';

import { useState } from 'react';
import { Check, Lock, Send, ShieldCheck } from 'lucide-react';

export function ChatPreview() {
  const [messages] = useState([
    { id: 1, name: 'Maria', text: 'El inventario de KUSH esta bajo', time: '14:32', mine: false },
    { id: 2, name: 'Tu', text: 'Lo reviso ahora. Cuanto queda?', time: '14:33', mine: true },
    { id: 3, name: 'Maria', text: 'Quedan 12g segun el sistema', time: '14:33', mine: false },
    { id: 4, name: 'Tu', text: 'Perfecto, hago entrada de stock', time: '14:34', mine: true },
  ]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E0DDD4] bg-white shadow-lg shadow-[#15140F]/8">
      <div className="flex items-center justify-between border-b border-[#F2EFE6] bg-[#FAF8F2] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#FFF6BF] text-xs font-bold text-[#15140F]">M</div>
          <div>
            <p className="text-sm font-semibold text-[#15140F]">Maria Lopez</p>
            <p className="text-[10px] text-[#7A7770]">En linea</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-[#FFF6BF] px-2 py-0.5 text-[10px] font-medium text-[#15140F]">
          <ShieldCheck size={10} /> E2E
        </div>
      </div>
      <div className="space-y-2 p-3" style={{ minHeight: 180 }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs ${
                msg.mine
                  ? 'rounded-br-md bg-[#15140F] text-white'
                  : 'rounded-bl-md bg-[#F2EFE6] text-[#15140F]'
              }`}
            >
              <p>{msg.text}</p>
              <p className={`mt-1 text-[9px] text-right ${msg.mine ? 'text-[#FFE600]' : 'text-[#7A7770]'}`}>{msg.time}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-[#F2EFE6] px-3 py-2">
        <Lock size={12} className="text-[#15140F]" />
        <div className="flex-1 rounded-full bg-[#FAF8F2] px-3 py-1.5 text-xs text-[#7A7770]">Mensaje cifrado...</div>
        <div className="grid h-7 w-7 place-items-center rounded-full bg-[#15140F] text-white">
          <Send size={12} />
        </div>
      </div>
    </div>
  );
}

export function PosPreview() {
  const [items] = useState([
    { name: 'KUSH Premium', qty: '2.0g', price: '10,00 CR' },
    { name: 'CBD Cookies', qty: '1 ud', price: '5,00 CR' },
  ]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E0DDD4] bg-white shadow-lg shadow-[#15140F]/8">
      <div className="border-b border-[#F2EFE6] bg-[#FAF8F2] px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#FFE600]" />
          <span className="text-xs font-medium text-[#15140F]">Caja abierta - Esperado: 350,00 CR</span>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#FFF6BF] text-xs font-bold text-[#15140F]">JA</div>
          <div>
            <p className="text-sm font-semibold text-[#15140F]">Jose Afonso</p>
            <p className="text-[10px] text-[#7A7770]">#04 - VIP</p>
          </div>
          <span className="ml-auto rounded-full bg-[#FFF6BF] px-2 py-0.5 text-[10px] font-medium text-[#15140F]">Activo</span>
        </div>
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.name} className="flex items-center justify-between rounded-lg bg-[#FAF8F2] p-2">
              <div>
                <p className="text-xs font-medium text-[#15140F]">{item.name}</p>
                <p className="text-[10px] text-[#7A7770]">{item.qty}</p>
              </div>
              <span className="text-xs font-bold text-[#15140F]">{item.price}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[#F2EFE6] pt-3">
          <span className="text-xs text-[#7A7770]">Total</span>
          <span className="text-lg font-bold text-[#15140F]">15,00 CR</span>
        </div>
        <button className="mt-3 w-full rounded-xl bg-[#15140F] py-2.5 text-xs font-semibold text-white">
          Registrar aportacion
        </button>
      </div>
    </div>
  );
}

export function DashboardPreview() {
  const kpis = [
    { label: 'Hoy', value: '47,50 CR', change: '+12%', positive: true },
    { label: 'Caja', value: '350,00 CR', change: 'Abierta', positive: true },
    { label: 'Stock bajo', value: '2', change: 'Revisar', positive: false },
    { label: 'Socios', value: '156', change: '+3 este mes', positive: true },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E0DDD4] bg-white shadow-lg shadow-[#15140F]/8">
      <div className="border-b border-[#F2EFE6] px-4 py-3">
        <p className="text-sm font-semibold text-[#15140F]">Dashboard</p>
        <p className="text-[10px] text-[#7A7770]">Resumen del dia</p>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-[#F2EFE6] p-3">
            <p className="text-[10px] text-[#7A7770]">{kpi.label}</p>
            <p className="mt-0.5 text-sm font-bold text-[#15140F]">{kpi.value}</p>
            <span className={`text-[9px] font-medium ${kpi.positive ? 'text-[#15140F]' : 'text-[#7A7770]'}`}>{kpi.change}</span>
          </div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <div className="rounded-xl bg-[#FAF8F2] p-3">
          <p className="mb-2 text-[10px] font-medium text-[#7A7770]">Dispensaciones (7 dias)</p>
          <div className="flex items-end gap-1" style={{ height: 40 }}>
            {[25, 40, 35, 55, 45, 60, 50].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-[#FFF6BF]" style={{ height: `${h}%` }}>
                <div className="h-full rounded-t bg-[#15140F]" style={{ height: `${60 + i * 5}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SecurityPreview() {
  const events = [
    { icon: 'Bloq', text: 'Enlace de acceso verificado', time: 'Hace 2 min' },
    { icon: 'OK', text: 'Login: Owner (192.168.1.x)', time: 'Hace 5 min' },
    { icon: 'Audit', text: 'Auditoria: 0 incidencias hoy', time: 'Hace 10 min' },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E0DDD4] bg-white shadow-lg shadow-[#15140F]/8">
      <div className="border-b border-[#2A2820] bg-[#15140F] px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-[#FFE600]" />
          <p className="text-sm font-semibold text-white">Seguridad</p>
          <span className="ml-auto rounded-full bg-[#FFE600]/15 px-2 py-0.5 text-[10px] font-medium text-[#FFE600]">Activo</span>
        </div>
      </div>
      <div className="space-y-2 p-3">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-[#F2EFE6] p-2.5">
            <span className="text-xs font-semibold text-[#15140F]">{e.icon}</span>
            <div className="flex-1">
              <p className="text-xs font-medium text-[#15140F]">{e.text}</p>
              <p className="text-[9px] text-[#7A7770]">{e.time}</p>
            </div>
          </div>
        ))}
        <div className="mt-2 grid grid-cols-3 gap-2">
          {['Access Link', 'Auditoria', 'Permisos'].map((label) => (
            <div key={label} className="flex items-center gap-1 rounded-lg bg-[#FFF6BF] px-2 py-1.5 text-[9px] font-medium text-[#15140F]">
              <Check size={9} /> {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

