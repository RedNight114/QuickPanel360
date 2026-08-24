# IVA Rule Extraction — Batch 01

**Estado:** `VERIFIED_PENDING_REVIEW`  
**Fecha:** 2026-08-24  
**Fuente principal:** Ley 37/1992, de 28 de diciembre, del IVA — texto consolidado BOE, última actualización publicada el 28/02/2026. citeturn1view0  
**Familias:** `IVA-NON-SUBJECT` · `IVA-EXEMPT-INTERNAL`

> Este documento convierte los arts. 7 y 20 en reglas candidatas atómicas. No las marca `ACTIVE` todavía. Antes de producción deben pasar revisión, modelado definitivo, tests automatizados y validación de dependencias.

## 1. Criterio de extracción

Cada supuesto jurídico se trata como una regla independiente. Las exclusiones expresas de la propia norma se modelan como condiciones negativas de la regla o como reglas de prioridad superior cuando sea necesario.

No se infiere una clase fiscal de producto a partir de nombres comerciales.

El resultado de estas reglas es principalmente:

- `OUT_OF_SCOPE` para no sujeción;
- `EXEMPT` para exención;
- sin `tax_rate` efectivo en ambos casos.

La regla general de IVA solo podrá ejecutarse después de que estas familias hayan sido evaluadas.

---

# 2. IVA — Artículo 7: operaciones no sujetas

La norma enumera doce grupos principales de operaciones no sujetas. El art. 7 vigente incluye, entre otros, transmisión de unidades económicas autónomas, muestras, demostraciones, publicidad gratuita, relaciones laborales, cooperativas, determinados autoconsumos sin derecho a deducción, sector público, concesiones, servicios gratuitos obligatorios, comunidades de regantes y entregas de dinero. citeturn4view0turn4view1

## NS-7-01 — Transmisión de unidad económica autónoma

**Resultado:** `OUT_OF_SCOPE`

**Condiciones positivas:**

- se transmiten elementos corporales y, en su caso, incorporales del patrimonio empresarial/profesional;
- el conjunto constituye o puede constituir una unidad económica autónoma;
- la unidad es capaz de desarrollar una actividad empresarial/profesional por sus propios medios;
- el adquirente acredita intención de mantener la afectación a una actividad empresarial/profesional.

**Exclusiones:**

- mera cesión de bienes o derechos;
- transmisión realizada por empresario/profesional cuya condición deriva exclusivamente del art. 5.Uno.c) cuando sea mera cesión de bienes;
- transmisión realizada por empresario/profesional cuya condición deriva exclusivamente de operaciones ocasionales del art. 5.Uno.d).

**Atributos requeridos:**

`operationType=TRANSFER_BUSINESS_UNIT`, `autonomousEconomicUnit`, `buyerBusinessUseIntent`, `assetsStructure`.

**Nota:** la regla no debe activarse porque una operación se describa como «venta de negocio». Debe acreditarse la unidad económica autónoma y las condiciones legales.

**Fuente:** art. 7.1. citeturn4view0

---

## NS-7-02 — Muestras comerciales sin valor comercial estimable

**Resultado:** `OUT_OF_SCOPE`

**Condiciones:**

- entrega gratuita;
- muestra de mercancía;
- valor comercial no estimable;
- finalidad promocional de actividad empresarial/profesional;
- por presentación o cantidad, solo puede utilizarse con fines de promoción.

**Atributos:** `isFree`, `isSample`, `commercialValue`, `promotionalPurpose`, `quantity/presentation`.

**Fuente:** art. 7.2. citeturn4view0

---

## NS-7-03 — Demostraciones gratuitas

**Resultado:** `OUT_OF_SCOPE`

**Condiciones:**

- prestación de servicios;
- gratuita;
- demostración;
- finalidad promocional de actividad empresarial/profesional.

**Fuente:** art. 7.3. citeturn4view0

---

## NS-7-04 — Impresos u objetos publicitarios gratuitos

**Resultado:** `OUT_OF_SCOPE`

**Condiciones:**

- entrega sin contraprestación;
- impreso u objeto de carácter publicitario;
- impreso con nombre visible del empresario/profesional que produce/comercializa bienes o presta servicios;
- objeto sin valor comercial intrínseco y con mención publicitaria indeleble.

**Excepción:** las entregas de objetos publicitarios a un mismo destinatario quedan sujetas si el coste total de suministros durante el año natural excede de 200 €, salvo entrega a otros sujetos pasivos para redistribución gratuita.

**Atributos:** `isFree`, `advertisingObject`, `recipient`, `annualCostToRecipient`, `redistributionByTaxablePerson`.

**Fuente:** art. 7.4. citeturn4view0

---

## NS-7-05 — Servicios en relación laboral/administrativa

**Resultado:** `OUT_OF_SCOPE`

**Condición:** servicio prestado por persona física en régimen de dependencia derivado de relación administrativa o laboral, incluida relación laboral especial.

**Fuente:** art. 7.5. citeturn4view0

---

## NS-7-06 — Servicios de socios de cooperativas

**Resultado:** `OUT_OF_SCOPE`

**Condiciones:**

- servicio prestado a cooperativa de trabajo asociado por uno de sus socios; o
- servicio prestado a otra cooperativa por socio de trabajo.

**Fuente:** art. 7.6. citeturn4view0

---

## NS-7-07 — Autoconsumos y servicios vinculados sin derecho a deducción

**Resultado:** `OUT_OF_SCOPE`

**Condiciones:**

- operación incluida en art. 9.1 o art. 12.1/12.2; y
- no se atribuyó al sujeto pasivo derecho a deducción total o parcial del IVA soportado en adquisición/importación de los bienes o componentes.

También:

- operación del art. 12.3;
- sujeto pasivo se limita a prestar el mismo servicio recibido de terceros;
- no existió derecho a deducir total o parcialmente el IVA soportado en recepción.

**Fuente:** art. 7.7. citeturn4view0

---

## NS-7-08 — Sector público: operaciones no sujetas

### NS-7-08-A — Entregas/prestaciones sin contraprestación o con contraprestación tributaria

**Condiciones:**

- entrega de bienes o prestación de servicios;
- realizada directamente por Administración Pública o entidad comprendida en el art. 7.8;
- sin contraprestación o con contraprestación de naturaleza tributaria.

### NS-7-08-B — Medio propio personificado

**Condiciones:**

- servicio prestado mediante encargo;
- entidad del sector público;
- condición de medio propio personificado conforme al art. 32 de la Ley de Contratos del Sector Público;
- encargo realizado por poder adjudicador correspondiente.

### NS-7-08-C — Entidades íntegramente dependientes

**Condiciones:**

- servicio prestado por ente/organismo/entidad del sector público;
- destinatario es Administración Pública de la que depende u otra íntegramente dependiente;
- Administración Pública mantiene titularidad íntegra;
- incluye servicios entre entidades íntegramente dependientes de la misma Administración.

### Exclusión — actividades siempre sujetas

No se aplica la no sujeción cuando la entidad pública realice las actividades enumeradas en el art. 7.8.F, entre ellas:

- telecomunicaciones;
- distribución de agua, gas, calor, frío y energía;
- transporte de personas o bienes;
- servicios portuarios/aeroportuarios e infraestructuras ferroviarias;
- fabricación/transformación para transmisión posterior;
- intervención sobre productos agropecuarios para regulación de mercado;
- ferias/exposiciones comerciales;
- almacenaje/depósito;
- oficinas comerciales de publicidad;
- cantinas, comedores, economatos y similares;
- agencias de viajes;
- actividades comerciales/mercantiles de radio y televisión públicas;
- mataderos.

**Fuente:** art. 7.8.A-F. citeturn2view1turn4view0

---

## NS-7-09 — Concesiones y autorizaciones administrativas

**Resultado general:** `OUT_OF_SCOPE`

**Excepciones sujetas:**

- cesión del derecho a utilizar dominio público portuario;
- cesión de inmuebles e instalaciones en aeropuertos;
- cesión del derecho a utilizar infraestructuras ferroviarias;
- autorizaciones para prestar servicios al público y desarrollar actividades comerciales o industriales en ámbito portuario.

**Fuente:** art. 7.9. citeturn4view1

---

## NS-7-10 — Servicios gratuitos obligatorios

**Resultado:** `OUT_OF_SCOPE`

**Condiciones:**

- prestación gratuita;
- servicio del art. 12.3;
- prestación obligatoria para el sujeto pasivo por norma jurídica o convenio colectivo.

Incluye los servicios telegráficos y telefónicos prestados en régimen de franquicia mencionados por la norma.

**Fuente:** art. 7.10. citeturn4view1

---

## NS-7-11 — Comunidades de Regantes

**Resultado:** `OUT_OF_SCOPE`

**Condición:** operaciones realizadas por Comunidades de Regantes para ordenación y aprovechamiento de las aguas.

**Fuente:** art. 7.11. citeturn4view1

---

## NS-7-12 — Entregas de dinero

**Resultado:** `OUT_OF_SCOPE`

**Condición:** entrega de dinero a título de contraprestación o pago.

**Fuente:** art. 7.12. citeturn4view1

---

# 3. IVA — Artículo 20: exenciones interiores

El art. 20 contiene un catálogo amplio de exenciones y numerosas exclusiones internas. El texto consolidado vigente identifica, entre otros, los servicios postales universales, asistencia sanitaria, asistencia social, educación, deporte, cultura, seguros, operaciones financieras, juego, terrenos, edificaciones, arrendamientos, determinadas entregas posteriores a operaciones exentas, servicios de determinados profesionales y partidos políticos. citeturn3view1turn5view0turn5view1turn5view2

Cada número del apartado Uno se trata como familia independiente porque sus condiciones subjetivas y objetivas son diferentes.

## EX-20-01 — Servicio postal universal

**Resultado:** `EXEMPT`

**Condiciones:**

- servicio postal universal;
- prestado por operador/es que se comprometen a prestar todo o parte del servicio;
- no se negocian individualmente las condiciones de prestación.

**Fuente:** art. 20.Uno.1.º. citeturn3view1

## EX-20-02 — Hospitalización y asistencia sanitaria institucional

**Resultado:** `EXEMPT`

**Condiciones:**

- hospitalización o asistencia sanitaria;
- realizada por entidad de Derecho público o entidad/establecimiento privado en régimen de precios autorizados o comunicados;
- operaciones directamente relacionadas pueden incluir alimentación, alojamiento, quirófano, medicamentos y material sanitario prestados por los establecimientos indicados.

**Exclusiones expresas:**

- entrega de medicamentos para consumo fuera de los establecimientos;
- alimentación/alojamiento a personas distintas de destinatarios de hospitalización/asistencia y acompañantes;
- servicios veterinarios;
- arrendamientos de bienes de dichas entidades.

**Fuente:** art. 20.Uno.2.º. citeturn3view1

## EX-20-03 — Asistencia sanitaria por profesionales médicos/sanitarios

**Resultado:** `EXEMPT`

**Condiciones:**

- asistencia a persona física;
- prestada por profesional médico/sanitario reconocido jurídicamente;
- incluye psicólogos, logopedas y ópticos diplomados en centros oficiales o reconocidos;
- finalidad: diagnóstico, prevención o tratamiento de enfermedades;
- incluye análisis clínicos y exploraciones radiológicas.

**Fuente:** art. 20.Uno.3.º. citeturn3view1

## EX-20-04 — Sangre, plasma, tejidos y elementos humanos

**Resultado:** `EXEMPT`

**Condiciones:**

- entrega de sangre, plasma, fluidos, tejidos u otros elementos del cuerpo humano;
- finalidad médica o de investigación, o procesamiento con esos fines.

**Fuente:** art. 20.Uno.4.º. citeturn3view1

## EX-20-05 — Servicios dentales y prótesis dentales

**Resultado:** `EXEMPT`

**Condiciones:**

- servicios realizados en el ámbito profesional por estomatólogos, odontólogos, mecánicos dentistas o protésicos dentales;
- incluye entrega, reparación y colocación de prótesis dentales y ortopedias maxilares realizadas por ellos.

**Fuente:** art. 20.Uno.5.º. citeturn3view1

## EX-20-06 — Servicios compartidos de agrupaciones/entidades exentas

**Resultado:** `EXEMPT`

**Condiciones acumulativas principales:**

- servicios prestados directamente a miembros;
- unión/agrupación/entidad autónoma constituida exclusivamente por personas que ejercen actividad exenta o no sujeta sin derecho a deducción;
- utilización directa y exclusiva en dicha actividad y necesidad para ejercerla;
- miembros solo reembolsan su parte de gastos comunes;
- actividad no incluida en los números excluidos por el propio art. 20.1.6.º;
- existe además una vía alternativa cuando la prorrata no supera el 10 % y se cumple el resto del requisito de reembolso.

**Exclusión:** servicios prestados por sociedades mercantiles.

**Fuente:** art. 20.Uno.6.º. citeturn3view1

## EX-20-07 — Seguridad Social para sus fines específicos

**Resultado:** `EXEMPT`

**Condiciones:**

- entrega/prestación realizada por Seguridad Social directamente o mediante entidades gestoras/colaboradoras;
- cumplimiento de fines específicos;
- sin contraprestación distinta de cotizaciones.

**Exclusión:** entregas de medicamentos o material sanitario realizadas por cuenta de la Seguridad Social.

**Fuente:** art. 20.Uno.7.º. citeturn2view2

## EX-20-08 — Asistencia social por entidades públicas o de carácter social

**Resultado:** `EXEMPT`

**Condiciones:**

- servicio de asistencia social;
- prestador: entidad de Derecho público o entidad/establecimiento privado de carácter social;
- actividad dentro del catálogo legal: protección de infancia/juventud, tercera edad, educación especial/discapacidad, minorías étnicas, refugiados/asilados, transeúntes, cargas familiares no compartidas, acción social comunitaria/familiar, exreclusos, reinserción/previsión de delincuencia, asistencia a alcohólicos/toxicómanos o cooperación para desarrollo.

La exención puede extenderse a alimentación, alojamiento o transporte accesorios cuando sean prestados por las entidades/establecimientos con medios propios o ajenos.

**Fuente:** art. 20.Uno.8.º. citeturn2view2

## EX-20-09 — Educación y enseñanza

**Resultado:** `EXEMPT`

**Condiciones:**

- educación infantil/juvenil, guarda y custodia, enseñanza escolar, universitaria y postgrado, idiomas, formación/reciclaje profesional;
- prestador: entidad de Derecho público o entidad privada autorizada;
- servicios y entregas directamente relacionados pueden quedar incluidos cuando los realiza la misma empresa educativa.

**Exclusiones expresas:**

- deporte prestado por empresas distintas de centros docentes;
- alojamiento/alimentación de colegios mayores/menores y residencias;
- determinadas enseñanzas de conducción;
- entregas de bienes a título oneroso.

**Fuente:** art. 20.Uno.9.º. citeturn5view0

## EX-20-10 — Clases particulares

**Resultado:** `EXEMPT`

**Condiciones:**

- persona física;
- clases a título particular;
- materia incluida en planes de estudios de niveles/grados del sistema educativo.

**Exclusión:** cuando para realizar la actividad sea necesario darse de alta en tarifas de actividades empresariales o artísticas del IAE.

**Fuente:** art. 20.Uno.10.º. citeturn5view0

## EX-20-11 — Cesión de personal por entidades religiosas

**Resultado:** `EXEMPT`

**Condiciones:**

- entidad religiosa inscrita en registro correspondiente del Ministerio de Justicia;
- cesión realizada para sus fines;
- destino a hospitalización/asistencia sanitaria, asistencia social del 20.1.8.º o educación/enseñanza/formación/reciclaje.

**Fuente:** art. 20.Uno.11.º. citeturn5view0

## EX-20-12 — Servicios a miembros de entidades sin ánimo de lucro

**Resultado:** `EXEMPT`

**Condiciones:**

- organismo/entidad legalmente reconocido;
- sin finalidad lucrativa;
- objetivos políticos, sindicales, religiosos, patrióticos, filantrópicos o cívicos;
- servicios y entregas accesorias directamente a miembros;
- realizados para fines específicos;
- no existe contraprestación distinta de cuotas estatutarias.

**Condición adicional:** no producir distorsiones de competencia.

**Fuente:** art. 20.Uno.12.º. citeturn5view0

## EX-20-13 — Deporte y educación física

**Resultado:** `EXEMPT`

**Condiciones:**

- servicio a persona física;
- directamente relacionado con práctica deportiva o educación física;
- prestador: entidad de Derecho público, federación deportiva, COE, CPE o entidad/establecimiento deportivo privado de carácter social.

**Exclusión:** espectáculos deportivos.

**Fuente:** art. 20.Uno.13.º. citeturn5view0

## EX-20-14 — Servicios culturales

**Resultado:** `EXEMPT`

**Condiciones:** prestador público o entidad/establecimiento cultural privado de carácter social y servicio incluido en:

- bibliotecas, archivos y centros de documentación;
- visitas a museos, galerías, pinacotecas, monumentos, lugares históricos, jardines botánicos, zoológicos, parques naturales y espacios naturales protegidos similares;
- representaciones teatrales, musicales, coreográficas, audiovisuales y cinematográficas;
- organización de exposiciones y manifestaciones similares.

**Fuente:** art. 20.Uno.14.º. citeturn5view0

## EX-20-15 — Transporte sanitario

**Resultado:** `EXEMPT`

**Condición:** transporte de enfermos o heridos en ambulancias o vehículos especialmente adaptados.

**Fuente:** art. 20.Uno.15.º. citeturn5view0

## EX-20-16 — Seguros, reaseguros y capitalización

**Resultado:** `EXEMPT`

**Condiciones:**

- operaciones de seguro, reaseguro o capitalización;
- mediación/captación de clientes para celebrar dichos contratos, independientemente de condición del mediador.

**Fuente:** art. 20.Uno.16.º. citeturn5view0

## EX-20-17 — Sellos de Correos y efectos timbrados

**Resultado:** `EXEMPT`

**Condiciones:**

- entrega de sellos de Correos y efectos timbrados de curso legal en España;
- importe no superior a valor facial.

**Exclusión:** servicios de expedición prestados en nombre y por cuenta de terceros.

**Fuente:** art. 20.Uno.17.º. citeturn5view0

## EX-20-18 — Operaciones financieras

**Resultado:** `EXEMPT`

Esta familia debe desglosarse internamente al menos por subapartado porque las exclusiones son diferentes:

- depósitos y operaciones relacionadas;
- transmisión de depósitos;
- concesión de créditos y préstamos;
- gestión de préstamos/créditos por quienes los concedieron;
- permutas financieras;
- transmisión de préstamos/créditos;
- fianzas, avales, cauciones y garantías;
- transmisión de garantías;
- transferencias, giros, cheques, pagarés, letras, tarjetas y órdenes de pago;
- transmisión de efectos y órdenes de pago;
- divisas, billetes y monedas de curso legal;
- operaciones sobre acciones, participaciones, obligaciones y otros valores;
- transmisión de valores;
- mediación en operaciones financieras exentas;
- gestión y depósito de determinadas instituciones de inversión colectiva y fondos.

**Exclusiones relevantes verificadas:** gestión de cobro de determinados créditos/documentos, determinados servicios de factoring, préstamos sindicados para prestamistas distintos del concedente, valores representativos de mercancías y determinados valores vinculados a inmuebles.

**Fuente:** art. 20.Uno.18.º. citeturn5view0turn5view1

## EX-20-19 — Loterías, apuestas y juegos determinados

**Resultado:** `EXEMPT`

**Condiciones:** hechos imponibles de tributos sobre el juego y determinadas actividades organizadas por SELAE, ONCE y organismos autonómicos correspondientes.

**Exclusión:** servicios de gestión y operaciones accesorias/complementarias que no constituyan el hecho imponible del tributo, salvo gestión del bingo.

**Fuente:** art. 20.Uno.19.º. citeturn5view1

## EX-20-20 — Terrenos no edificables

**Resultado:** `EXEMPT`

**Condiciones:** entrega de terrenos rústicos y demás no edificables, incluidas construcciones indispensables para explotación agraria, o terrenos destinados exclusivamente a parques/jardines públicos o superficies viales de uso público.

**Exclusiones principales:** terrenos urbanizados/en urbanización, salvo los destinados exclusivamente a parques/jardines públicos o vías públicas; terrenos con edificaciones en construcción o terminadas transmitidas conjuntamente cuando la entrega de la edificación esté sujeta y no exenta, con las excepciones agrarias y de construcciones paralizadas/ruinosas/derruidas previstas en el artículo.

**Fuente:** art. 20.Uno.20.º. citeturn5view1

## EX-20-21

**Estado:** `NOT_APPLICABLE_SUPPRESSED`

El número 21.º está suprimido en el texto consolidado. No crear regla fiscal activa.

## EX-20-22 — Segundas y ulteriores entregas de edificaciones

**Resultado:** `EXEMPT`

**Condiciones principales:**

- segunda o ulterior entrega de edificación;
- construcción/rehabilitación terminada;
- aplicación de las reglas legales de primera entrega y utilización previa.

**Exclusiones principales:**

- entrega en ejercicio de opción de compra de arrendamiento financiero en los términos legales;
- entrega para rehabilitación por adquirente cuando se cumplan requisitos reglamentarios;
- entrega de edificación para demolición previa a nueva promoción.

**Rehabilitación:** el artículo establece criterios cuantitativos y materiales, entre ellos más del 50 % del coste del proyecto vinculado a obras de consolidación/tratamiento estructural, fachadas/cubiertas u obras análogas/conexas, y requisito de coste superior al 25 % del precio/valor de referencia con exclusión proporcional del suelo.

**Fuente:** art. 20.Uno.22.º. citeturn5view1

## EX-20-23 — Arrendamientos y constitución/transmisión de derechos reales

**Estado:** `PARTIALLY_EXTRACTED`

El artículo contiene una familia extensa de arrendamientos exentos y numerosas excepciones. Entre los supuestos excluidos se encuentran arrendamientos de terrenos para estacionamiento, depósito/almacenaje o actividades empresariales, exposiciones/publicidad, determinados arrendamientos con opción de compra, apartamentos/viviendas amueblados con servicios complementarios propios de hostelería, subarriendo, determinados edificios asimilados a vivienda y determinados derechos reales.

**Acción pendiente:** convertir todo el 20.Uno.23.º en reglas atómicas separadas por modalidad de arrendamiento y excepción antes de `VERIFIED`.

**Fuente:** art. 20.Uno.23.º. citeturn5view2

## EX-20-24 — Bienes utilizados en operaciones exentas sin derecho a deducción

**Resultado:** `EXEMPT`

**Condiciones:**

- bienes utilizados por transmitente en operaciones exentas del art. 20;
- no se atribuyó derecho a deducción total o parcial en adquisición, afectación o importación;
- con reglas específicas sobre deducción parcial y prorrata.

**Exclusiones:** bienes de inversión durante período de regularización; casos en que procedan exenciones de 20.º o 22.º.

**Fuente:** art. 20.Uno.24.º. citeturn5view2

## EX-20-25 — Bienes con exclusión total del derecho a deducir

**Resultado:** `EXEMPT`

**Condición:** entrega de bienes cuya adquisición, afectación o importación hubiera determinado exclusión total del derecho a deducir del transmitente conforme a arts. 95 y 96.

**Fuente:** art. 20.Uno.25.º. citeturn5view2

## EX-20-26 — Servicios profesionales de autores y artistas determinados

**Resultado:** `EXEMPT`

**Condición:** servicios profesionales, incluso contraprestación en derechos de autor, prestados por los profesionales enumerados en la norma: artistas plásticos, escritores, colaboradores literarios/gráficos/fotográficos de periódicos y revistas, compositores musicales, autores de obras teatrales y audiovisuales en los términos legales, traductores y adaptadores.

**Fuente:** art. 20.Uno.26.º. citeturn5view2

## EX-20-27

**Estado:** `NOT_APPLICABLE_SUPPRESSED`

Número suprimido. No crear regla activa.

## EX-20-28 — Partidos políticos

**Resultado:** `EXEMPT`

**Condiciones:**

- prestaciones de servicios y entregas de bienes;
- realizadas por partidos políticos;
- con motivo de manifestaciones destinadas a obtener apoyo financiero para su finalidad específica;
- organizadas en su exclusivo beneficio.

**Fuente:** art. 20.Uno.28.º. citeturn5view2

---

# 4. Reglas transversales del art. 20

## EX-20-WAIVER — Renuncia a determinadas exenciones

El apartado Dos permite renunciar a las exenciones de los números 20.º y 22.º cuando se cumplen las condiciones subjetivas y de derecho a deducción previstas legalmente y los requisitos reglamentarios.

Esto **no es una nueva exención**: es una condición que puede impedir que una regla de exención se materialice y debe modelarse como `waiver`/`renunciation` explícito.

## EX-20-SOCIAL-ENTITY — Entidad/establecimiento privado de carácter social

El apartado Tres establece requisitos sobre:

- ausencia de finalidad lucrativa y destino de beneficios;
- gratuidad de cargos de presidente/patrono/representante;
- ausencia de destinatarios principales entre socios/comuneros/partícipes y determinados familiares, con excepción legal para 20.1.8.º y 20.1.13.º;
- posibilidad de solicitar calificación administrativa;
- eficacia vinculada al mantenimiento de requisitos.

El motor no debe tratar `isSocialEntity=true` como dato suficiente: debe poder existir evidencia de los requisitos jurídicos.

---

# 5. Dependencias que deben existir antes de activar el 21 %

La resolución de `IVA-21` debe quedar detrás de:

1. ámbito territorial;
2. hecho imponible;
3. no sujeción art. 7;
4. exenciones art. 20 y demás exenciones relevantes;
5. operaciones intracomunitarias/exportaciones/importaciones cuando correspondan;
6. sujeto pasivo e inversión;
7. tipo reducido/superreducido del art. 91;
8. regímenes especiales.

Por tanto, este batch **no activa `IVA-21` todavía**.

---

# 6. Tests mínimos generados

## No sujeción

- `NS-7-01-P`: transmisión de unidad económica autónoma con intención acreditada de continuidad → `OUT_OF_SCOPE`.
- `NS-7-01-N`: mera cesión aislada de bienes → no aplicar NS-7-01.
- `NS-7-02-P`: muestra gratuita sin valor comercial estimable y finalidad promocional → `OUT_OF_SCOPE`.
- `NS-7-02-N`: muestra con valor comercial o uso no limitado a promoción → no aplicar NS-7-02.
- `NS-7-04-P`: objeto publicitario gratuito dentro del límite anual → `OUT_OF_SCOPE`.
- `NS-7-04-N`: objeto publicitario >200 € acumulados al mismo destinatario sin redistribución → sujeto.
- `NS-7-05-P`: trabajador por cuenta ajena → `OUT_OF_SCOPE`.
- `NS-7-08-P`: servicio sector público cubierto y no incluido en actividad excluida → `OUT_OF_SCOPE`.
- `NS-7-08-N`: servicio de telecomunicaciones prestado por Administración → no aplicar no sujeción.
- `NS-7-09-N`: autorización para actividad comercial/industrial portuaria → no aplicar no sujeción.

## Exenciones

- `EX-20-01-P`: servicio postal universal no negociado individualmente → `EXEMPT`.
- `EX-20-01-N`: servicio postal negociado individualmente → no aplicar.
- `EX-20-02-P`: asistencia sanitaria cubierta por establecimiento habilitado → `EXEMPT`.
- `EX-20-02-N`: medicamento vendido para consumo fuera del establecimiento → no aplicar.
- `EX-20-03-P`: diagnóstico realizado por profesional sanitario cualificado → `EXEMPT`.
- `EX-20-09-P`: enseñanza reglada por entidad autorizada → `EXEMPT`.
- `EX-20-09-N`: entrega onerosa de bienes por centro educativo → no aplicar.
- `EX-20-13-P`: servicio deportivo directamente relacionado prestado por entidad habilitada → `EXEMPT`.
- `EX-20-13-N`: espectáculo deportivo → no aplicar.
- `EX-20-20-P`: terreno no edificable que cumple supuesto → `EXEMPT`.
- `EX-20-20-N`: terreno urbanizado no incluido en excepción → no aplicar.
- `EX-20-22-P`: segunda entrega de edificación fuera de excepciones → `EXEMPT`.
- `EX-20-22-N`: primera entrega del promotor → no aplicar segunda entrega.
- `EX-20-26-P`: servicio profesional prestado por autor incluido → `EXEMPT`.

---

# 7. Estado del batch

| Familia | Estado |
|---|---|
| IVA art. 7 | `EXTRACTED_PENDING_REVIEW` |
| IVA art. 20.1.1–20.1.22 | `EXTRACTED_PENDING_REVIEW` |
| IVA art. 20.1.23 | `PARTIALLY_EXTRACTED` |
| IVA art. 20.1.24–28 | `EXTRACTED_PENDING_REVIEW` |
| IVA art. 20.Dos | `EXTRACTED_PENDING_REVIEW` |
| IVA art. 20.Tres | `EXTRACTED_PENDING_REVIEW` |
| IVA 21 % | `BLOCKED_BY_DEPENDENCIES` |

## 8. Próximo batch

El siguiente bloque debe completar:

1. **Art. 20.Uno.23.º** en reglas atómicas completas.
2. **Arts. 13–16** — adquisiciones intracomunitarias.
3. **Arts. 68–77** — lugar de realización.
4. **Arts. 84–87** — sujeto pasivo e inversión.
5. Después, **arts. 21 y 25** — exportaciones y entregas intracomunitarias exentas.

La extracción de tipos reducidos del art. 91 debe hacerse después de disponer de las condiciones anteriores, porque el mismo producto puede requerir una resolución previa sobre territorio, operación, sujeto pasivo o exención.

---

## Fuentes oficiales

- BOE — Ley 37/1992, texto consolidado, última actualización publicada el 28/02/2026. citeturn1view0
- Art. 7 — operaciones no sujetas. citeturn4view0turn4view1
- Art. 20 — exenciones en operaciones interiores. citeturn3view1turn5view0turn5view1turn5view2

**Regla de cierre:** este documento no convierte automáticamente ninguna regla en `ACTIVE`. La activación exige revisión, vigencia, fuente, condiciones formalizadas y tests reproducibles.