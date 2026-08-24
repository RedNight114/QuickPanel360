# Reglas fiscales pendientes de desglosar

**Estado:** `VERIFIED_PENDING_RULE_EXTRACTION`  
**Fecha:** 2026-08-24  
**Origen:** `ADR-019` · Catálogo jurídico

## 1. Propósito

Este documento es el inventario de trabajo para convertir el catálogo jurídico de tipos fiscales en reglas fiscales atómicas y verificables.

El catálogo de tipos puede estar cargado y verificado contra su fuente, pero eso no significa que el motor pueda determinar qué tratamiento corresponde a una operación concreta.

La regla es la unidad que responde a:

> dadas estas condiciones, en esta fecha y jurisdicción, ¿qué impuesto y tratamiento corresponden?

Mientras una familia no tenga sus reglas extraídas, formalizadas y verificadas, el motor debe preferir `TAX_INDETERMINATE` a una resolución por inferencia.

## 2. Regla de integridad

**Nada de este inventario debe completarse por inferencia comercial o semántica.**

No es válido asignar una categoría fiscal porque un producto «parezca» pertenecer a ella. Toda regla `ACTIVE` debe poder defenderse mediante:

- fuente oficial;
- artículo identificable;
- apartado/párrafo cuando sea relevante;
- vigencia;
- condiciones formalizadas;
- test positivo;
- test negativo cuando sea razonable;
- ausencia de conflicto abierto.

## 3. Estado global

Actualmente las reglas pendientes de extracción son:

- IVA: pendiente.
- IGIC: pendiente.
- IPSI Ceuta: pendiente de catálogo local.
- IPSI Melilla: pendiente de catálogo local.
- `product_tax_classes`: vacía hasta que exista un vínculo normativo verificable.

Hasta completar la extracción, no se debe activar ninguna regla de producción que dependa de una categoría fiscal no demostrada.

## 4. IVA — Ley 37/1992

### 4.1 Familias pendientes

| Familia | Artículos | Trabajo pendiente |
|---|---|---|
| `IVA-REDUCED-RATES` | 91 | Desglosar cada supuesto del 10 % y 4 %, con clase fiscal y prueba |
| `IVA-EXEMPT-INTERNAL` | 20 | Extraer exenciones interiores y sus condiciones |
| `IVA-EXPORT-EXEMPT` | 21 | Exportaciones y prueba de salida/expedición |
| `IVA-NON-SUBJECT` | 7 | Extraer supuestos de no sujeción |
| `IVA-INTRA-EU` | 13–16 | Operaciones intracomunitarias |
| `IVA-PLACE-OF-SUPPLY` | 68–77 | Lugar de realización de cada familia de operación |
| `IVA-TAXPAYER` | 84–87 | Sujeto pasivo, inversión y supuestos especiales |
| `IVA-SPECIAL-REGIMES` | Título IX | Regímenes especiales y sus reglas de resolución |

La fuente oficial vigente debe utilizarse para la extracción. La Ley 37/1992 contiene el art. 91 con supuestos concretos para los tipos reducidos, por lo que el tipo no debe convertirse directamente en una regla genérica de producto. citeturn0search24

### 4.2 IVA 21 %

`IVA-21` no debe activarse como regla productiva independiente hasta que existan las reglas precedentes de no sujeción, exención y demás tratamientos que puedan excluir una operación del tipo general.

La regla conceptual será:

```text
SI
  operación está dentro del ámbito del IVA
  Y no existe una regla de no sujeción aplicable
  Y no existe una exención aplicable
  Y no existe un supuesto especial aplicable
ENTONCES
  IVA 21 %
```

Esta representación es una especificación conceptual, no una autorización para crear la regla `ACTIVE` sin haber implementado sus dependencias.

## 5. IGIC — Decreto Legislativo 1/2025

### 5.1 Familias pendientes

| Familia | Artículo | Trabajo pendiente |
|---|---:|---|
| `IGIC-GENERAL` | 32 | Regla general y dependencias de exclusión |
| `IGIC-ZERO` | 33 | Extraer cada supuesto del 0 % |
| `IGIC-SPECIFIC-01` | 33 bis | Definir exactamente petróleo y productos derivados del refino |
| `IGIC-SUPER-REDUCED` | 34 | Extraer categorías del 3 % |
| `IGIC-REDUCED` | 35 | Extraer categorías del 5 % |
| `IGIC-INCREASED` | 36 | Extraer supuestos del 15 % |
| `IGIC-SPECIAL` | 37 | Extraer supuestos del 20 % |
| `IGIC-HOUSING` | 38 | Viviendas y condiciones |
| `IGIC-VEHICLES` | 39 | Vehículos terrestres y condiciones, incluida potencia fiscal cuando sea jurídicamente relevante |
| `IGIC-VESSELS` | 40 | Buques, embarcaciones y artefactos navales |
| `IGIC-AIRCRAFT` | 41 | Aviones, avionetas y demás aeronaves |
| `IGIC-EXEMPTIONS` | Cap. II anterior | Exenciones que deben evaluarse antes de seleccionar el porcentaje |
| `IGIC-RETAILERS` | Art. 27 y relacionados | Tratamiento de comerciantes minoristas |
| `IGIC-SPECIAL-REGIMES` | Cap. III y siguientes | Regímenes especiales que puedan alterar la resolución |

El texto refundido vigente confirma la estructura de los artículos 32–41 y que el art. 32 hace depender el 7 % de que la operación no esté sometida a los restantes tipos. citeturn0search0turn0search5

### 5.2 IGIC 1 %

`IGIC-SPECIFIC-01` debe modelarse como una regla específica, no como un alias de `IGIC-GENERAL` ni como una variante del 0 %.

La redacción vigente del art. 33 bis establece el 1 % para las entregas e importaciones de petróleo y productos derivados del refino del petróleo, incluso mezclados con biocarburantes, con vigencia desde el 01/07/2026. citeturn0search3

La extracción debe determinar cómo representar la condición material de producto sin inventar equivalencias comerciales. Cuando la norma requiera nomenclatura o clasificación técnica, el modelo debe guardar esa referencia como condición de la regla.

## 6. IPSI — Ceuta y Melilla

No se deben crear tipos ni reglas productivas hasta incorporar las fuentes fiscales locales vigentes.

### Ceuta

Pendiente:

- Ordenanzas fiscales vigentes.
- Tarifas por familias de bienes/servicios/importaciones.
- Vigencias.
- Exenciones y bonificaciones aplicables.
- Referencias a nomenclatura arancelaria cuando proceda.
- Gravámenes complementarios cuando correspondan.

### Melilla

Pendiente:

- Ordenanzas fiscales vigentes.
- Tarifas por familias de bienes/servicios/importaciones.
- Vigencias.
- Exenciones y bonificaciones aplicables.
- Referencias a nomenclatura arancelaria cuando proceda.
- Gravámenes complementarios cuando correspondan.

**Regla de aislamiento:** Ceuta y Melilla deben mantener catálogos y reglas independientes.

Los gravámenes complementarios sobre labores del tabaco y carburantes no deben reducirse a un `rate` porcentual único si jurídicamente combinan componente porcentual y componente específico por unidad. El modelo monetario deberá soportar esa modalidad antes de activarlos.

## 7. Clasificación fiscal de productos

`product_tax_classes` debe permanecer vacía o en estado no operativo hasta que cada clase tenga reglas que la conecten con supuestos legales concretos.

Las clases internas propuestas por ADR-019, por ejemplo:

- `FOOD_GENERAL`
- `MEDICINAL_PRODUCT`
- `PETROLEUM_PRODUCT`
- etc.

no son categorías legales por sí mismas.

Cada clase debe poder responder:

1. qué concepto legal representa;
2. qué fuente lo respalda;
3. qué artículos lo utilizan;
4. qué atributos del producto son necesarios para demostrarlo;
5. qué reglas fiscales lo consumen;
6. qué evidencia puede conservarse.

Cuando una regla dependa de nomenclatura arancelaria, clasificación sanitaria u otra clasificación externa, debe modelarse explícitamente y no sustituirse por un nombre comercial.

## 8. Modelo mínimo de una regla extraída

Cada regla que salga de este inventario deberá documentarse con al menos:

```yaml
id: TAX-RULE-EXAMPLE
status: VERIFIED
jurisdiction: ES_CANARIAS
tax: IGIC
valid_from: YYYY-MM-DD
valid_to: null
source:
  norm_type: LEY_OR_DECRETO
  norm_number: ...
  article: ...
  section: ...
conditions:
  - field: ...
    operator: ...
    value: ...
result:
  tax_rate: ...
  treatment: ...
priority: ...
positive_test: ...
negative_test: ...
explanation: ...
```

El YAML es una representación documental del contrato; la implementación final deberá ajustarse al esquema Prisma/API aprobado por ADR-019.

## 9. Estados de una regla

- `DRAFT` — extracción inicial, pendiente de revisión.
- `VERIFIED` — condiciones contrastadas con fuente oficial.
- `ACTIVE` — puede participar en resolución productiva.
- `SUPERSEDED` — sustituida por una versión posterior.
- `RETIRED` — ya no vigente.
- `CONFLICT` — existe incompatibilidad que requiere resolución.

No debe existir transición automática de `DRAFT` a `ACTIVE`.

## 10. Criterio de cierre de una entrada

Una entrada del inventario se considera cerrada solo cuando:

- [ ] se ha identificado el texto legal vigente;
- [ ] se ha identificado artículo y apartado relevante;
- [ ] se han separado condiciones obligatorias de condiciones opcionales;
- [ ] se ha identificado la fecha de vigencia;
- [ ] se ha definido el resultado fiscal;
- [ ] se ha definido la prioridad frente a reglas generales;
- [ ] se han identificado dependencias con otras reglas;
- [ ] se ha definido la clase fiscal necesaria;
- [ ] se ha creado un test positivo;
- [ ] se ha creado un test negativo cuando sea razonable;
- [ ] se ha comprobado que no existe conflicto con otra regla;
- [ ] se ha registrado la fuente oficial;
- [ ] la regla puede generar una explicación reproducible.

## 11. Orden recomendado de extracción

Para evitar que las reglas generales oculten tratamientos especiales, el trabajo debe hacerse en este orden:

1. IVA — no sujeción.
2. IVA — exenciones.
3. IVA — lugar de realización.
4. IVA — sujeto pasivo e inversión.
5. IVA — operaciones intracomunitarias/exportaciones.
6. IVA — tipos reducidos del art. 91.
7. IVA — regímenes especiales.
8. IGIC — exenciones y minoristas.
9. IGIC — tipo cero.
10. IGIC — tipo específico 1 %.
11. IGIC — 3 %.
12. IGIC — 5 %.
13. IGIC — 15 % y 20 %.
14. IGIC — vivienda, vehículos, buques y aeronaves.
15. IGIC — regímenes especiales restantes.
16. IPSI Ceuta — catálogo local.
17. IPSI Melilla — catálogo local.
18. Clasificación fiscal de productos y evidencias.

## 12. Regla de seguridad del motor

Mientras una condición necesaria para resolver no esté disponible o no exista una regla verificable, la respuesta debe ser:

```text
TAX_INDETERMINATE
```

No se permite fallback silencioso a un porcentaje general cuando una regla específica podría ser aplicable.

Si existe más de una regla válida con igual prioridad y resultado incompatible:

```text
TAX_RULE_CONFLICT
```

El sistema debe bloquear la resolución automática hasta que el conflicto sea resuelto.

## 13. Relación con ADR-019

Este documento operacionaliza la sección de catálogo jurídico de ADR-019. No modifica por sí mismo el modelo de datos ni autoriza la implementación de reglas no verificadas.

El objetivo de este inventario es que el trabajo de extracción legal pueda hacerse de forma incremental, auditable y reversible.

## 14. Fuentes base

- Ley 37/1992, de 28 de diciembre, del Impuesto sobre el Valor Añadido — BOE: https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740
- Decreto Legislativo 1/2025, de 13 de octubre, texto refundido IGIC/AIEM — BOE: https://www.boe.es/buscar/act.php?id=BOC-j-2025-90249
- Ley 8/1991, de 25 de marzo, de modificación del Concierto Económico con la Comunidad Autónoma de Canarias — marco estatal del IPSI y normativa aplicable a Ceuta/Melilla.

**Criterio final:** el inventario no se considera cerrado por haber identificado un porcentaje. Se considera cerrado únicamente cuando la regla que permite llegar a ese porcentaje ha sido extraída, formalizada, probada y vinculada a su fuente legal.