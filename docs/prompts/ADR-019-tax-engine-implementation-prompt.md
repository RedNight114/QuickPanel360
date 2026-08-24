# Prompt de implementación — ADR-019 Tax Rule Engine V2

## Objetivo

Implementar en QuickPanel360 el Tax Rule Engine V2 definido por `docs/decisions/ADR-019-tax-catalog-v2.md` y el catálogo jurídico `docs/tax/tax-legal-catalog-es-2026.md`.

## Regla principal

No programes un sistema basado en `if jurisdiction === ... then rate = ...` ni hardcodees porcentajes dentro del servicio de cálculo. El porcentaje es un dato versionado y la decisión fiscal es una regla versionada con fuente legal.

## Antes de modificar código

1. Inspecciona la arquitectura existente.
2. Localiza el schema Prisma actual relacionado con impuestos, productos, presupuestos, facturas y líneas.
3. Lee ADR-018 y cualquier migración relacionada si existe en el repositorio.
4. No borres campos existentes sin migración y justificación.
5. Respeta la arquitectura y convenciones actuales.
6. Determina si existe ya `ProductTaxClass`, `TaxRule` o equivalente y reutilízalo si encaja.

## Modelo objetivo

Implementar o adaptar estas entidades:

### TaxJurisdiction

- id
- code
- name
- countryCode
- active

### Tax

- id
- code
- name
- jurisdictionId
- active

### TaxRate

- id
- code
- taxId
- rate Decimal
- rateType
- treatment
- validFrom
- validTo
- legalSourceId
- status

### TaxRule

- id
- code
- taxId
- jurisdictionId
- priority
- operationType
- conditions JSON/estructura equivalente
- resultTaxRateId
- resultTreatment
- validFrom
- validTo
- legalSourceId
- explanationTemplate
- status

### TaxLegalSource

- id
- jurisdiction
- taxId nullable
- normType
- normNumber
- title
- publicationDate
- effectiveFrom
- effectiveTo nullable
- article
- section nullable
- paragraph nullable
- officialUrl
- retrievedAt
- verificationStatus
- sourceHash nullable
- notes

### ProductTaxClass

Si ya existe, amplíalo solo cuando sea necesario. Debe representar clasificación fiscal, no un porcentaje fijo.

## TaxTreatment

Usa un enum o tabla equivalente con:

- STANDARD
- REDUCED
- SUPER_REDUCED
- INCREASED
- SPECIAL
- ZERO_RATE
- EXEMPT
- OUT_OF_SCOPE
- REVERSE_CHARGE
- SPECIAL_REGIME
- SURCHARGE

No permitas que `rate = 0` determine por sí solo el tratamiento.

## Resolución

Implementar una función/servicio equivalente a:

`resolveTax(context): TaxResolution`

El contexto debe poder contener:

- taxPointDate;
- seller jurisdiction;
- buyer jurisdiction;
- goods location;
- place of supply;
- operation type;
- product tax class;
- product category;
- customer tax status;
- seller tax status;
- special regime;
- intra-EU flag;
- import/export flag;
- reverse charge facts;
- other legally relevant facts.

Orden:

1. Determinar jurisdicción fiscal.
2. Determinar impuesto potencial.
3. Evaluar no sujeción.
4. Evaluar exención.
5. Evaluar sujeto pasivo/inversión.
6. Evaluar régimen especial.
7. Evaluar reglas específicas por operación/producto.
8. Evaluar regla general.
9. Aplicar vigencia por fecha de devengo.
10. Resolver prioridad/especificidad.
11. Detectar conflictos.
12. Calcular cuota.
13. Crear explicación.

## Resultado

El resultado debe contener al menos:

- taxCode
- taxRateCode
- rate
- treatment
- jurisdiction
- ruleCode
- legalSource
- matchedConditions
- rejectedRules opcional pero recomendado
- explanation
- taxBase
- taxAmount
- warnings

Estados de resolución:

- `RESOLVED`
- `TAX_INDETERMINATE`
- `TAX_RULE_CONFLICT`
- `INVALID_CONTEXT`

Nunca seleccionar arbitrariamente una regla en conflicto.

## Snapshot

En factura y documentos que deban conservar la decisión fiscal, persistir:

- tax code;
- rate;
- treatment;
- jurisdiction;
- rule code;
- legal source/version;
- tax base;
- tax amount.

Una factura emitida no debe depender de que el catálogo futuro conserve el mismo resultado.

## Seed inicial 2026

Crear seed versionado y reproducible.

### IVA

- IVA general 21 %, art. 90.
- IVA 10 %, art. 91, únicamente como resultado de reglas concretas.
- IVA 4 %, art. 91, únicamente como resultado de reglas concretas.
- No crear IVA-00 genérico.

Fuente oficial:
`https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740`

### IGIC

Crear los TaxRate base:

- IGIC-00 — 0 % — art. 33.
- IGIC-01 — 1 % — art. 33 bis — vigente desde 01/07/2026 para petróleo y derivados definidos por la norma.
- IGIC-03 — 3 % — art. 34.
- IGIC-05 — 5 % — art. 35.
- IGIC-07 — 7 % — art. 32.
- IGIC-09_5 — 9,5 % — supuestos específicos.
- IGIC-15 — 15 % — art. 36.
- IGIC-20 — 20 % — art. 37.

Fuente oficial:
`https://www.boe.es/buscar/act.php?id=BOC-j-2025-90249`

### IPSI

No seedes un porcentaje genérico de Ceuta/Melilla.

Crear las jurisdicciones y el marco legal, y preparar la estructura para cargar por separado las Ordenanzas fiscales vigentes de cada Ciudad.

Fuente estatal:
`https://www.boe.es/buscar/act.php?id=BOE-A-1991-7645`

## Tests obligatorios

Crear tests unitarios para:

1. IVA general 21 %.
2. IVA reducido 10 % cuando una regla del art. 91 corresponda.
3. IVA superreducido 4 % cuando una regla del art. 91 corresponda.
4. IVA exento distinto de IVA cero.
5. IVA no sujeto.
6. IGIC general 7 %.
7. IGIC 0 % cuando corresponda.
8. IGIC 1 % para petróleo/derivados desde 01/07/2026.
9. IGIC 1 % antes del 01/07/2026 no debe resolverse por esta regla.
10. IGIC 3/5/15/20 por reglas específicas.
11. IPSI requiere jurisdicción concreta y tarifa local.
12. Regla más específica vence a regla general.
13. Regla fuera de vigencia no puede ganar.
14. Conflicto de igual prioridad produce `TAX_RULE_CONFLICT`.
15. Contexto insuficiente produce `TAX_INDETERMINATE`.
16. Snapshot no cambia al modificar posteriormente el catálogo.

## Migraciones

- Genera migración Prisma.
- No edites migraciones ya aplicadas.
- Verifica `prisma validate`.
- Verifica generación de cliente.
- Verifica constraints e índices.
- Añade índices para `taxId`, `jurisdictionId`, `validFrom`, `validTo`, `status`, `priority` y combinaciones usadas en resolución.
- Evita JSON sin esquema si la arquitectura actual permite una tabla de condiciones normalizada; si se usa JSON, define un contrato tipado y validado.

## API

Exponer únicamente el contrato necesario para:

- resolver impuesto;
- consultar catálogo;
- explicar una resolución;
- administrar reglas solo para roles autorizados.

No permitir que el frontend envíe directamente un porcentaje para sobrescribir la decisión fiscal salvo que exista un mecanismo explícito de ajuste manual auditado.

## Auditoría

Registrar cambios de reglas y fuentes legales. Toda modificación debe guardar:

- quién;
- cuándo;
- qué cambió;
- versión anterior;
- versión nueva;
- motivo;
- fuente legal.

## Criterios de aceptación

La implementación solo se considera terminada cuando:

- [ ] ADR-019 está respetado.
- [ ] El modelo Prisma representa impuestos, tipos, reglas y fuentes.
- [ ] Las reglas tienen vigencia temporal.
- [ ] La fecha de devengo gobierna la vigencia.
- [ ] Exento, no sujeto y tipo cero están diferenciados.
- [ ] Existe detección de conflictos.
- [ ] Existe resultado indeterminado cuando faltan datos.
- [ ] IVA 21/10/4 está correctamente modelado.
- [ ] IGIC 0/1/3/5/7/9,5/15/20 está modelado como catálogo, sin convertir todos los tipos en reglas generales.
- [ ] IGIC 1 % está limitado a su supuesto y fecha legal.
- [ ] IPSI está separado por Ceuta/Melilla y preparado para ordenanzas locales.
- [ ] Existe snapshot fiscal en documentos aplicables.
- [ ] Hay tests unitarios de resolución.
- [ ] Lint, typecheck, tests y build pasan.
- [ ] No existen porcentajes fiscales hardcodeados en servicios de negocio.

## Importante

No completes automáticamente reglas legales que no estén en el catálogo verificado. Si falta una regla, crea el punto pendiente como `VERIFIED_PENDING_RULE_EXTRACTION` y deja un test/documentación que indique qué fuente debe desglosarse.

El objetivo es un motor fiscal auditable y extensible, no una colección de porcentajes.
