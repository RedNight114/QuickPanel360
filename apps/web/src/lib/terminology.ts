export const terminology = {
  Venta: 'Dispensación',
  Ventas: 'Dispensaciones',
  Vender: 'Dispensar',
  Vendido: 'Dispensado',
  Empleado: 'Colaborador',
  Empleados: 'Colaboradores',
  Cobrar: 'Registrar aportación',
  Cobro: 'Registro de aportación',
  Pago: 'Aportación',
  Pagos: 'Aportaciones',
  Descuento: 'Bonificación',
  Cliente: 'Socio',
  Clientes: 'Socios',
  TPV: 'Punto de dispensación',
  Carrito: 'Selección',
  Ticket: 'Comprobante',
  Precio: 'Valor',
  Euro: 'Crédito',
  Euros: 'Créditos',
  '€': 'CR',
  EUR: 'CR',
} as const;

const terminologyEntries = Object.entries(terminology).sort(
  ([a], [b]) => b.length - a.length,
);

export function applyTerminology(text: string) {
  return terminologyEntries.reduce(
    (result, [source, target]) => result.replaceAll(source, target),
    text,
  );
}
