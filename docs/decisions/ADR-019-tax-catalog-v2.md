# ADR-019 — Tax Rule Engine V2: catálogo fiscal, reglas legales y trazabilidad

- **Estado:** PROPOSED
- **Fecha:** 2026-08-24
- **Ámbito:** Fiscalidad / Facturación / Presupuestos / Motor de impuestos
- **Precedente:** ADR-018 — Tax Rule Engine
- **Decisión:** separar catálogo de impuestos, tipos, tratamientos, reglas de resolución y fuentes legales, con vigencia temporal y snapshot de resultado.

## 1. Contexto

El motor fiscal no puede limitarse a almacenar porcentajes. Una misma figura tributaria contiene tipos distintos, exenciones, no sujeción, inversión del sujeto pasivo, reglas de localización, regímenes especiales y condiciones dependientes del producto, operación, territorio, sujeto y fecha de devengo.

La normativa vigente consultada confirma este enfoque. La Ley 37/1992 mantiene el 21 % como tipo general del IVA y regula los tipos reducidos en el artículo 91; además, el tipo aplicable es el vigente en el momento del devengo. citeturn0search2

Para Canarias, el Decreto Legislativo 1/2025, con actualización aplicable desde el 01/01/2026, estructura el IGIC en tipo cero, 3 %, 5 %, 7 %, 9,5 %, 15 % y 20 %, con artículos específicos para cada familia. citeturn1search0turn1search1

Para Ceuta y Melilla, el marco estatal del IPSI fija el marco de gravamen y deja las tarifas concretas a las Ordenanzas de las Ciudades, dentro del intervalo legal correspondiente; por tanto, no debe existir un único catálogo estatal de tipos IPSI reutilizado automáticamente entre ambas ciudades. citeturn2search36turn2search0

## 2. Decisión

QuickControl adoptará un modelo fiscal de seis capas:

1. **Jurisdicción fiscal** — territorio relevante para la operación.
2. **Impuesto** — IVA, IGIC, IPSI_CEUTA, IPSI_MELILLA y futuras figuras.
3. **Tipo / TaxRate** — porcentaje o modalidad cuantitativa vigente.
4. **Tratamiento / TaxTreatment** — estándar, reducido, cero, exento, no sujeto, inversión del sujeto pasivo, régimen especial, etc.
5. **Regla / TaxRule** — condiciones que determinan qué tratamiento y tipo se aplican.
6. **Fuente legal / TaxLegalSource** — norma, artículo, apartado, vigencia y referencia verificable.

El resultado de la resolución fiscal se guardará como **snapshot inmutable** en el documento fiscal que lo utilice. Una modificación futura del catálogo nunca debe recalcular retroactivamente una factura o documento ya emitido.

## 3. Jurisdicciones iniciales

| Código | Jurisdicción | Descripción |
|---|---|---|
| ES_MAINLAND | España — Península | Territorio de aplicación del IVA español fuera de Canarias, Ceuta y Melilla |
| ES_BALEARES | España — Baleares | Territorio IVA; se mantiene separado como dimensión territorial aunque comparta régimen IVA |
| ES_CANARIAS | España — Canarias | Territorio IGIC |
| ES_CEUTA | España — Ceuta | Territorio IPSI |
| ES_MELILLA | España — Melilla | Territorio IPSI |

La jurisdicción no debe deducirse únicamente del país ISO. Debe poder representar territorios fiscales especiales.

## 4. Impuestos iniciales

| Código | Nombre | Jurisdicciones |
|---|---|---|
| IVA | Impuesto sobre el Valor Añadido | ES_MAINLAND, ES_BALEARES |
| IGIC | Impuesto General Indirecto Canario | ES_CANARIAS |
| IPSI_CEUTA | Impuesto sobre la Producción, los Servicios y la Importación — Ceuta | ES_CEUTA |
| IPSI_MELILLA | Impuesto sobre la Producción, los Servicios y la Importación — Melilla | ES_MELILLA |

## 5. TaxRate

Un TaxRate representa un porcentaje o modalidad cuantitativa, no la razón jurídica por la que se aplica.

Campos mínimos:

- `code`
- `taxId`
- `jurisdictionId`
- `rate`
- `rateType`
- `treatment`
- `validFrom`
- `validTo`
- `legalSourceId`
- `status`

Regla crítica: **no introducir un porcentaje como universal si la norma lo condiciona a una categoría, operación, territorio o fecha**.

## 6. TaxTreatment

Valores iniciales:

- `STANDARD`
- `REDUCED`
- `SUPER_REDUCED`
- `INCREASED`
- `SPECIAL`
- `ZERO_RATE`
- `EXEMPT`
- `OUT_OF_SCOPE`
- `REVERSE_CHARGE`
- `SPECIAL_REGIME`
- `SURCHARGE`

`ZERO_RATE` y `EXEMPT` son estados distintos y no deben colapsarse en `rate = 0`.

## 7. TaxRule

Una TaxRule expresa la condición jurídica que selecciona el resultado fiscal.

Campos mínimos:

- `id`
- `code`
- `taxId`
- `jurisdictionId`
- `priority`
- `operationType`
- `conditions`
- `resultTaxRateId`
- `resultTreatment`
- `validFrom`
- `validTo`
- `legalSourceId`
- `explanationTemplate`
- `status`

Las condiciones deben poder consultar, como mínimo:

- fecha de devengo;
- jurisdicción del vendedor;
- jurisdicción del cliente;
- ubicación de los bienes;
- lugar de prestación;
- tipo de operación;
- producto / TaxClass;
- naturaleza del bien o servicio;
- condición de empresario/profesional;
- régimen fiscal;
- importación/exportación;
- operación intracomunitaria;
- sujeto pasivo;
- condición de inversión del sujeto pasivo;
- exención;
- umbrales y requisitos legales;
- autorización o reconocimiento previo cuando sea exigible.

## 8. Orden de resolución

El motor debe resolver por especificidad, no por simple porcentaje:

1. Determinar territorio y ley aplicable.
2. Determinar naturaleza de la operación.
3. Determinar si está fuera de ámbito / no sujeta.
4. Determinar exención.
5. Determinar sujeto pasivo / inversión.
6. Determinar régimen especial aplicable.
7. Determinar categoría fiscal del bien o servicio.
8. Seleccionar TaxRule vigente en la fecha de devengo.
9. Seleccionar TaxRate vigente asociado.
10. Resolver recargos u obligaciones complementarias.
11. Calcular cuota.
12. Generar explicación y referencias legales.
13. Persistir snapshot.

## 9. Precedencia y conflictos

Una regla más específica debe prevalecer sobre una regla general si ambas son válidas.

La prioridad debe ser determinista:

1. regla explícita de no sujeción/exención cuando corresponda;
2. regla especial por operación;
3. regla especial por producto/servicio;
4. regla por régimen fiscal;
5. regla territorial específica;
6. regla general del impuesto.

Si dos reglas de igual especificidad y prioridad producen resultados incompatibles, el motor debe devolver `TAX_RULE_CONFLICT` y bloquear la emisión automática. No debe elegir arbitrariamente.

## 10. IVA — baseline legal 2026

Fuente principal: Ley 37/1992, de 28 de diciembre, del Impuesto sobre el Valor Añadido.

- Art. 20: exenciones en operaciones interiores.
- Arts. 21–24: determinadas exenciones relacionadas con exportaciones, zonas/regímenes y operaciones asimiladas.
- Arts. 68–77: lugar de realización de las operaciones.
- Arts. 84–87: sujetos pasivos y responsables.
- Art. 88: repercusión.
- Art. 90: tipo general del 21 %.
- Art. 91: tipos reducidos, con supuestos jurídicos específicos.
- Arts. 92 y siguientes: deducciones.
- Título IX: regímenes especiales.

El 21 % es el tipo general vigente según la consolidación del BOE actualizada el 28/02/2026. citeturn0search2

**No se debe sembrar `IVA-00` como sinónimo de exento.** Los casos de exención y no sujeción deben estar respaldados por reglas y tratamiento jurídico.

## 11. IGIC — baseline legal 2026

Fuente principal vigente para el catálogo de tipos: Decreto Legislativo 1/2025, de 13 de octubre, texto refundido de normas legales de Canarias relativas al IGIC y AIEM, con redacción aplicable desde 2026.

Según su artículo 32, el catálogo base de tipos es:

| Código propuesto | Tipo | Tratamiento | Base legal |
|---|---:|---|---|
| IGIC-00 | 0 % | ZERO_RATE | Art. 33 |
| IGIC-03 | 3 % | SUPER_REDUCED | Art. 34 |
| IGIC-05 | 5 % | REDUCED | Art. 35 |
| IGIC-07 | 7 % | STANDARD | Art. 32 |
| IGIC-09_5 | 9,5 % | INCREASED | Arts. 39–41 |
| IGIC-15 | 15 % | INCREASED | Art. 36 |
| IGIC-20 | 20 % | SPECIAL | Art. 37 |

El artículo 32 establece además que el tipo aplicable es el vigente en el momento del devengo y que las importaciones se gravan con el tipo correspondiente a entregas de bienes de la misma naturaleza. citeturn1search0turn1search1

**Corrección respecto al catálogo preliminar:** `IGIC-01` no debe incluirse como tipo general vigente del catálogo 2026. La fuente consolidada actual enumera 0 %, 3 %, 5 %, 7 %, 9,5 %, 15 % y 20 %. citeturn1search0

## 12. IPSI — diseño separado para Ceuta y Melilla

La Ley 8/1991 constituye el marco estatal del impuesto y dispone que los tipos son fijados por las respectivas Ciudades mediante sus Tarifas/Ordenanzas, dentro del marco legal. La fuente consolidada consultada recoge que los tipos deben quedar comprendidos entre el 0,5 % y el 10 %. citeturn2search36

Por ello:

- no se crea un `IPSI-STANDARD` estatal único;
- Ceuta tendrá su propio catálogo de tarifas;
- Melilla tendrá su propio catálogo de tarifas;
- cada tarifa debe almacenar la ordenanza o disposición local que la respalda;
- las tarifas deben versionarse por fecha de vigencia;
- las categorías de bienes deben poder mapearse a nomenclatura arancelaria cuando la ordenanza lo utilice.

## 13. Fuente legal

`TaxLegalSource` debe almacenar:

- `id`
- `jurisdiction`
- `taxId`
- `normType`
- `normNumber`
- `title`
- `publicationDate`
- `effectiveFrom`
- `effectiveTo`
- `article`
- `section`
- `paragraph`
- `officialUrl`
- `retrievedAt`
- `verificationStatus`
- `sourceHash` opcional
- `notes`

La URL oficial debe apuntar a BOE, boletín autonómico, ordenanza o fuente administrativa oficial aplicable.

## 14. Explicabilidad

Cada resolución debe devolver:

- impuesto;
- porcentaje o modalidad;
- tratamiento;
- regla seleccionada;
- condiciones que hicieron match;
- reglas relevantes descartadas y motivo del descarte;
- fuente legal;
- fecha de vigencia comprobada;
- cálculo de cuota;
- advertencias si existe información insuficiente.

## 15. Snapshot

Los documentos fiscales deben almacenar los valores efectivos usados en el momento de emisión:

- tax code;
- rate;
- treatment;
- tax jurisdiction;
- rule code;
- legal source identifier;
- legal source version/date;
- tax base;
- tax amount.

El snapshot es obligatorio para facturas emitidas y recomendable para presupuestos aceptados.

## 16. Seed inicial

El seed debe contener únicamente datos verificados y etiquetados con fuente.

No se debe convertir una lista informal de porcentajes en datos productivos sin fuente legal.

El seed inicial deberá comenzar por:

- IVA general 21 %;
- familias de IVA del art. 91, con reglas separadas por supuesto;
- IGIC 0/3/5/7/9,5/15/20;
- reglas IGIC de los artículos 33–41;
- IPSI Ceuta con tarifas oficiales de la Ciudad;
- IPSI Melilla con tarifas oficiales de la Ciudad.

## 17. Tests fiscales

Cada regla legal debe tener como mínimo:

- caso positivo;
- caso negativo;
- límite temporal;
- regla más específica que la general;
- conflicto, cuando sea posible;
- explicación esperada;
- fuente legal esperada.

Los tests deben cubrir especialmente los cambios de tipo por fecha de devengo.

## 18. Estados de datos

- `DRAFT` — aún no apto para producción.
- `VERIFIED` — comprobado contra fuente oficial.
- `ACTIVE` — vigente y apto para resolución.
- `SUPERSEDED` — sustituido por una versión posterior.
- `RETIRED` — retirado del catálogo.
- `CONFLICT` — requiere revisión jurídica/técnica.

## 19. Política de actualización

Las actualizaciones normativas se incorporan como nuevas versiones. Nunca se edita destructivamente una regla histórica utilizada en documentos emitidos.

Cada cambio debe registrar:

- fuente;
- fecha de publicación;
- fecha de entrada en vigor;
- regla afectada;
- diferencia respecto a la versión anterior;
- tests nuevos/modificados;
- responsable de revisión.

## 20. Fuentes oficiales verificadas en esta ADR

1. Ley 37/1992, IVA — BOE, texto consolidado actualizado el 28/02/2026. citeturn0search2
2. Decreto Legislativo 1/2025 de Canarias — texto refundido IGIC/AIEM, redacción aplicable desde 01/01/2026. citeturn1search0turn1search1
3. Ley 8/1991 — marco del IPSI y tarifas/ordenanzas de Ceuta y Melilla. citeturn2search36turn2search0
4. Orden HAC/1177/2024 — claves de régimen y desglose fiscal de facturación, incluyendo IVA, IGIC e IPSI. citeturn2search5

## 21. Consecuencias

### Positivas

- evita tratar impuestos como simples porcentajes;
- permite resolver por fecha de devengo;
- permite explicar cada decisión fiscal;
- permite auditoría y reconstrucción histórica;
- permite incorporar nuevas jurisdicciones;
- permite diferenciar exento, no sujeto y tipo cero;
- permite versionar IPSI por ciudad.

### Costes

- mayor complejidad de datos;
- necesidad de revisión normativa continua;
- necesidad de tests legales;
- necesidad de mantener fuentes y vigencias;
- mayor complejidad del motor de resolución.

## 22. No incluido todavía

Este ADR no autoriza a inventar reglas fiscales no verificadas. La cobertura exhaustiva de IVA, IGIC, IPSI Ceuta e IPSI Melilla se realizará mediante el catálogo legal versionado asociado a este ADR.

**Criterio de aceptación:** ninguna regla `ACTIVE` puede existir sin fuente legal oficial, vigencia y al menos un test fiscal reproducible.
