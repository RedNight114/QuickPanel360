# Tax Legal Catalog — España 2026

**Estado:** VERIFIED_BASELINE
**Fecha de corte:** 2026-08-24
**Ámbito:** IVA, IGIC, IPSI Ceuta, IPSI Melilla
**Propósito:** catálogo jurídico versionable para alimentar TaxRule/TaxRate/TaxLegalSource.

> Este archivo es un catálogo técnico-jurídico de fuentes y reglas base. No sustituye asesoramiento fiscal. Una regla no marcada como `ACTIVE` no debe utilizarse automáticamente para emitir documentos fiscales.

## 1. Fuentes oficiales

### IVA

- **Norma:** Ley 37/1992, de 28 de diciembre, del Impuesto sobre el Valor Añadido.
- **Referencia BOE:** BOE-A-1992-28740.
- **Texto consolidado consultado:** última actualización publicada el 28/02/2026.
- **Fuente:** https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740
- **ELI:** https://www.boe.es/eli/es/l/1992/12/28/37/con

### IGIC

- **Norma:** Decreto Legislativo 1/2025, de 13 de octubre, por el que se aprueba el texto refundido de las normas legales aprobadas por la Comunidad Autónoma de Canarias en relación con el IGIC y el AIEM.
- **Referencia BOE:** BOC-j-2025-90249.
- **Redacción relevante consultada:** actualización publicada el 07/04/2026; el art. 33 bis entra en vigor el 01/07/2026.
- **Fuente:** https://www.boe.es/buscar/act.php?id=BOC-j-2025-90249

### IPSI

- **Norma marco:** Ley 8/1991, de 25 de marzo, por la que se aprueba el Arbitrio sobre la Producción, los Servicios y la Importación en las ciudades de Ceuta y Melilla.
- **Referencia BOE:** BOE-A-1991-7645.
- **Fuente:** https://www.boe.es/buscar/act.php?id=BOE-A-1991-7645
- **Regla crítica:** el artículo 18 establece que los tipos de gravamen son fijados por las Ordenanzas de las Ciudades respectivas y deben estar comprendidos entre 0,5 % y 10 %. El tipo aplicable es el vigente en el momento del devengo.

## 2. Convenciones de catálogo

Cada entrada debe tener:

- `id`
- `code`
- `tax`
- `jurisdiction`
- `rate`
- `treatment`
- `scope`
- `legalSource`
- `article`
- `validFrom`
- `validTo`
- `status`
- `verification`
- `notes`

### Estados

- `ACTIVE`: puede resolver operaciones cuando se cumplen todas sus condiciones.
- `VERIFIED`: fuente verificada pero todavía no necesariamente habilitada para resolución automática.
- `DRAFT`: en elaboración.
- `SUPERSEDED`: reemplazada por una versión posterior.
- `RETIRED`: sin vigencia.
- `CONFLICT`: requiere revisión.

## 3. IVA — tipos base

### IVA-21

- **Code:** `IVA-21`
- **Tax:** `IVA`
- **Jurisdiction:** `ES_MAINLAND`, `ES_BALEARES`
- **Rate:** `21.00`
- **Treatment:** `STANDARD`
- **Legal source:** Ley 37/1992
- **Article:** 90.1
- **Valid from:** 2012-09-01 como tipo general; verificar la fecha histórica si se necesitan documentos anteriores.
- **Status:** `ACTIVE`
- **Verification:** `VERIFIED`
- **Nota:** el artículo 90.2 establece que el tipo aplicable es el vigente en el momento del devengo.

### IVA-10

- **Code:** `IVA-10`
- **Tax:** `IVA`
- **Rate:** `10.00`
- **Treatment:** `REDUCED`
- **Legal source:** Ley 37/1992
- **Article:** 91
- **Status:** `ACTIVE_AS_RULE_RESULT`
- **Nota:** no es una regla universal. Debe activarse exclusivamente mediante reglas que cumplan los supuestos concretos del artículo 91.

### IVA-04

- **Code:** `IVA-04`
- **Tax:** `IVA`
- **Rate:** `4.00`
- **Treatment:** `SUPER_REDUCED`
- **Legal source:** Ley 37/1992
- **Article:** 91
- **Status:** `ACTIVE_AS_RULE_RESULT`
- **Nota:** no es una regla universal. Debe activarse exclusivamente mediante reglas que cumplan los supuestos concretos del artículo 91.

### IVA-00

No crear `IVA-00` como tipo fiscal genérico. `rate = 0` puede representar situaciones jurídicamente distintas y el motor debe usar `TaxTreatment` para distinguirlas.

Casos mínimos diferenciables:

- `EXEMPT`
- `OUT_OF_SCOPE`
- `ZERO_RATE`, solo cuando exista un supuesto legal de tipo cero aplicable.

## 4. IVA — mapa de reglas legales inicial

El catálogo de reglas debe desglosar como mínimo:

| Rule family | Norma | Artículos | Estado |
|---|---|---|---|
| IVA-SCOPE | Ley 37/1992 | 1–3 | VERIFIED |
| IVA-TAXABLE-SUPPLY | Ley 37/1992 | 4–12 | VERIFIED |
| IVA-NON-SUBJECT | Ley 37/1992 | 7 | VERIFIED |
| IVA-INTRA-EU | Ley 37/1992 | 13–16 | VERIFIED |
| IVA-IMPORT | Ley 37/1992 | 17–19 | VERIFIED |
| IVA-EXEMPT-INTERNAL | Ley 37/1992 | 20 | VERIFIED |
| IVA-EXPORT-EXEMPT | Ley 37/1992 | 21 | VERIFIED |
| IVA-SPECIAL-TERRITORIAL | Ley 37/1992 | 22–24 | VERIFIED |
| IVA-PLACE-OF-SUPPLY | Ley 37/1992 | 68–77 | VERIFIED |
| IVA-TAXPAYER | Ley 37/1992 | 84–87 | VERIFIED |
| IVA-RECHARGE | Ley 37/1992 | 88 | VERIFIED |
| IVA-GENERAL-RATE | Ley 37/1992 | 90 | ACTIVE |
| IVA-REDUCED-RATES | Ley 37/1992 | 91 | ACTIVE_AS_RULE_RESULT |
| IVA-DEDUCTIONS | Ley 37/1992 | 92+ | OUTSIDE_RATE_RESOLVER |
| IVA-SPECIAL-REGIMES | Ley 37/1992 | Title IX | VERIFIED |

Las familias marcadas `VERIFIED` son fuentes de reglas; todavía deben descomponerse en reglas atómicas antes de habilitar automatización completa.

## 5. IGIC — tipos 2026

### IGIC-00

- **Rate:** 0 %
- **Treatment:** `ZERO_RATE`
- **Article:** 33
- **Status:** `ACTIVE_AS_RULE_RESULT`
- **Fuente:** Decreto Legislativo 1/2025.

### IGIC-01

- **Rate:** 1 %
- **Treatment:** `SPECIAL`
- **Article:** 33 bis
- **Status:** `ACTIVE_AS_RULE_RESULT`
- **Vigencia:** desde 2026-07-01.
- **Alcance:** entregas e importaciones de petróleo y productos derivados del refino del petróleo, incluso mezclados con biocarburantes, conforme al art. 33 bis.
- **Fuente:** Decreto Legislativo 1/2025, redacción actualizada por Ley 9/2025.

> Corrección importante respecto a un catálogo preliminar: `IGIC-01` sí debe existir en el catálogo 2026, pero como **tipo específico condicionado**, no como tipo general. La redacción consolidada publicada el 07/04/2026 incorpora el art. 33 bis con entrada en vigor el 01/07/2026.

### IGIC-03

- **Rate:** 3 %
- **Treatment:** `SUPER_REDUCED`
- **Article:** 34
- **Status:** `ACTIVE_AS_RULE_RESULT`

### IGIC-05

- **Rate:** 5 %
- **Treatment:** `REDUCED`
- **Article:** 35
- **Status:** `ACTIVE_AS_RULE_RESULT`

### IGIC-07

- **Rate:** 7 %
- **Treatment:** `STANDARD`
- **Article:** 32
- **Status:** `ACTIVE`

### IGIC-09_5

- **Rate:** 9.5 %
- **Treatment:** `INCREASED`
- **Articles:** 36–41, según supuesto
- **Status:** `ACTIVE_AS_RULE_RESULT`
- **Nota:** no debe resolverse como un tipo general; depende de categorías y operaciones concretas.

### IGIC-15

- **Rate:** 15 %
- **Treatment:** `INCREASED`
- **Article:** 36
- **Status:** `ACTIVE_AS_RULE_RESULT`

### IGIC-20

- **Rate:** 20 %
- **Treatment:** `SPECIAL`
- **Article:** 37
- **Status:** `ACTIVE_AS_RULE_RESULT`

## 6. IGIC — reglas por familias

| Rule family | Artículo | Estado | Observación |
|---|---:|---|---|
| IGIC-GENERAL | 32 | ACTIVE | Tipo general 7 % y normas temporales |
| IGIC-ZERO | 33 | ACTIVE_AS_RULE_RESULT | Solo supuestos legalmente definidos |
| IGIC-SPECIFIC-01 | 33 bis | ACTIVE_AS_RULE_RESULT | Petróleo y derivados desde 01/07/2026 |
| IGIC-SUPER-REDUCED | 34 | ACTIVE_AS_RULE_RESULT | Categorías expresamente enumeradas |
| IGIC-REDUCED | 35 | ACTIVE_AS_RULE_RESULT | Categorías expresamente enumeradas |
| IGIC-INCREASED | 36 | ACTIVE_AS_RULE_RESULT | Supuestos expresamente enumerados |
| IGIC-SPECIAL | 37 | ACTIVE_AS_RULE_RESULT | Supuestos expresamente enumerados |
| IGIC-HOUSING | 38 | ACTIVE_AS_RULE_RESULT | Viviendas |
| IGIC-VEHICLES | 39 | ACTIVE_AS_RULE_RESULT | Vehículos terrestres |
| IGIC-VESSELS | 40 | ACTIVE_AS_RULE_RESULT | Buques y embarcaciones |
| IGIC-AIRCRAFT | 41 | ACTIVE_AS_RULE_RESULT | Aeronaves |

## 7. IGIC — exenciones y regímenes

Antes de resolver el porcentaje, el motor debe evaluar las exenciones y condiciones de sujeción. El texto refundido contiene, entre otros, capítulos de exenciones y comerciantes minoristas, y regímenes especiales.

No se debe modelar una exención simplemente como `rate = 0`.

## 8. IPSI — Ceuta y Melilla

### IPSI-CEUTA / IPSI-MELILLA

No se define un tipo estándar único en este catálogo estatal.

Regla jurídica base:

- `tax`: IPSI
- `jurisdiction`: `ES_CEUTA` o `ES_MELILLA`
- `legalSource`: Ley 8/1991
- `article`: 18
- `rate`: obtenido de la Ordenanza fiscal vigente de la ciudad correspondiente
- `validFrom`: fecha de entrada en vigor de la ordenanza/tarifa
- `status`: `VERIFIED_PENDING_LOCAL_CATALOG`

El artículo 18 fija un intervalo de 0,5 % a 10 % y establece que los tipos son fijados por las Ordenanzas de las respectivas Ciudades. El tipo aplicable es el vigente en el momento del devengo.

### Gravámenes complementarios

El IPSI contiene gravámenes complementarios para determinadas labores del tabaco y ciertos carburantes/combustibles. Estos no deben modelarse como simples `TaxRate` del tipo principal: deben tener su propia entidad de gravamen o regla complementaria.

## 9. TaxClass — catálogo mínimo recomendado

El producto no debe apuntar directamente a un porcentaje. Debe apuntar a una clase fiscal que las reglas puedan evaluar.

Ejemplos iniciales no exhaustivos:

- `GENERAL_GOODS`
- `FOOD_GENERAL`
- `FOOD_SPECIAL`
- `BEVERAGE_ALCOHOLIC`
- `BEVERAGE_SUGARED`
- `MEDICINAL_PRODUCT`
- `MEDICAL_DEVICE`
- `BOOK_PUBLICATION`
- `CHILDREN_PRODUCT`
- `HOUSING`
- `ENERGY_PRODUCT`
- `PETROLEUM_PRODUCT`
- `VEHICLE`
- `VESSEL`
- `AIRCRAFT`
- `TOBACCO`
- `SERVICE_GENERAL`

Estas clases son **taxonomía interna**, no categorías legales por sí mismas. Cada una deberá enlazarse a reglas concretas y, cuando proceda, códigos CNAE/CN/NACE/u otra nomenclatura legal.

## 10. Regla de fecha

La fecha principal del motor es la **fecha de devengo**, no la fecha de creación del documento.

Pseudorregla:

`effectiveRule = rule.validFrom <= taxPointDate AND (validTo IS NULL OR taxPointDate < validTo)`

Cuando la normativa establezca una fecha especial de entrada en vigor, debe prevalecer esa fecha específica.

## 11. Regla de seguridad jurídica del catálogo

Una entrada puede estar en producción solo si:

1. existe fuente oficial;
2. existe artículo/apartado identificable;
3. existe vigencia;
4. las condiciones están formalizadas;
5. existe al menos un test positivo;
6. existe al menos un test negativo cuando sea razonable;
7. no existe conflicto abierto.

## 12. Estado de cobertura

| Área | Cobertura actual | Próximo trabajo |
|---|---|---|
| IVA tipos | Baseline verificado | Desglosar art. 91 en reglas atómicas |
| IVA exenciones | Mapa de fuente | Desglosar art. 20 y siguientes |
| IVA localización | Mapa de fuente | Reglas por tipo de operación |
| IVA sujeto pasivo | Mapa de fuente | Reglas art. 84 |
| IGIC tipos | Baseline 2026 verificado | Desglosar arts. 33–41 |
| IGIC exenciones | Fuente identificada | Reglas atómicas |
| IGIC regímenes | Fuente identificada | Reglas atómicas |
| IPSI Ceuta | Marco estatal verificado | Incorporar Ordenanzas/tarifas oficiales vigentes |
| IPSI Melilla | Marco estatal verificado | Incorporar Ordenanzas/tarifas oficiales vigentes |

## 13. Criterio de no invención

Si el sistema no tiene suficiente información para seleccionar una regla, debe devolver `TAX_INDETERMINATE` y explicar qué dato falta.

Nunca debe:

- asumir 21 % por defecto cuando la jurisdicción sea desconocida;
- asumir IGIC 7 % para cualquier operación canaria;
- asumir IPSI por el mero hecho de que el cliente esté en Ceuta/Melilla;
- tratar exento como tipo cero;
- ignorar la fecha de devengo;
- seleccionar una regla entre dos reglas incompatibles sin resolver el conflicto.
