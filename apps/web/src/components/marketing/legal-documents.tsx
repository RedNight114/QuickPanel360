import { branding } from "@/lib/branding";

export const legalLastUpdated = "25 de junio de 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-2">
      <h3 className="text-base font-semibold text-[#15140F]">{title}</h3>
      <div className="min-w-0 space-y-3 break-words text-sm leading-6 text-[#4A4840] [overflow-wrap:anywhere]">
        {children}
      </div>
    </section>
  );
}

export function PrivacyDocument() {
  return (
    <div className="min-w-0 space-y-6 break-words [overflow-wrap:anywhere]">
      <Section title="1. Responsable del tratamiento">
        <p>
          {branding.companyName} es la entidad responsable del tratamiento de los
          datos personales recogidos a traves de {branding.appName}, sus
          formularios de solicitud y las comunicaciones comerciales derivadas de
          una peticion de acceso o demostracion.
        </p>
      </Section>

      <Section title="2. Datos que tratamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>Datos de contacto: nombre, email y telefono.</li>
          <li>Datos de empresa: nombre del club, pais y numero aproximado de colaboradores.</li>
          <li>Datos operativos y tecnicos: logs de acceso, auditoria y uso basico del servicio.</li>
          <li>Preferencias de contacto, idioma y consentimientos guardados.</li>
        </ul>
      </Section>

      <Section title="3. Finalidad del tratamiento">
        <ul className="list-disc space-y-2 pl-5">
          <li>Gestionar solicitudes de acceso, demo o alta manual.</li>
          <li>Prestar soporte comercial y operativo.</li>
          <li>Garantizar seguridad, trazabilidad y auditoria de la plataforma.</li>
          <li>Mejorar el producto y resolver incidencias.</li>
          <li>Cumplir obligaciones legales y contractuales.</li>
        </ul>
      </Section>

      <Section title="4. Base legal">
        <ul className="list-disc space-y-2 pl-5">
          <li>Consentimiento expreso al enviar formularios.</li>
          <li>Ejecucion de la relacion precontractual o contractual.</li>
          <li>Interes legitimo en seguridad, soporte y mejora del servicio.</li>
        </ul>
      </Section>

      <Section title="5. Conservacion de los datos">
        <p>
          Conservamos los datos mientras exista relacion contractual o mientras
          sea necesario para atender una solicitud activa. Las solicitudes no
          convertidas podran conservarse hasta 12 meses para seguimiento
          comercial razonable, salvo peticion de supresion previa.
        </p>
      </Section>

      <Section title="6. Aislamiento y acceso a la informacion">
        <p>
          Cada empresa opera en un entorno aislado. Los datos de una empresa no
          son visibles para otra. El acceso interno del equipo de{" "}
          {branding.companyName} se limita a tareas de soporte, mantenimiento,
          facturacion manual y administracion del servicio, siempre bajo
          criterios de minima necesidad.
        </p>
      </Section>

      <Section title="7. Derechos del usuario">
        <p>
          Puedes solicitar acceso, rectificacion, supresion, oposicion,
          limitacion o portabilidad escribiendo a{" "}
          <strong>{branding.contactEmail}</strong>.
        </p>
      </Section>

      <Section title="8. Cookies y almacenamiento local">
        <p>
          Utilizamos almacenamiento local y cookies tecnicas necesarias para el
          funcionamiento de la experiencia web, incluyendo preferencias de
          idioma, consentimiento y elementos de sesion. No activamos cookies
          publicitarias de terceros por defecto.
        </p>
      </Section>

      <Section title="9. Seguridad">
        <p>
          Aplicamos medidas tecnicas y organizativas como cifrado en
          comunicaciones, control de acceso por roles, trazabilidad y registros
          de auditoria para proteger la informacion tratada dentro de la
          plataforma.
        </p>
      </Section>
    </div>
  );
}

export function TermsDocument() {
  return (
    <div className="min-w-0 space-y-6 break-words [overflow-wrap:anywhere]">
      <Section title="1. Objeto del servicio">
        <p>
          {branding.appName} es una plataforma SaaS operada por{" "}
          {branding.companyName} para la gestion diaria de clubes y empresas con
          necesidades de control operativo, seguridad, inventario, caja,
          socios, analitica y administracion.
        </p>
      </Section>

      <Section title="2. Acceso y activacion">
        <p>
          El acceso se concede tras revision manual del equipo de{" "}
          {branding.companyName}. La solicitud no implica aceptacion automatica.
          La activacion final depende de validacion comercial, disponibilidad
          operativa y confirmacion del plan.
        </p>
      </Section>

      <Section title="3. Planes, precios y altas">
        <p>
          Los planes publicados en la web son informativos y pueden ajustarse
          segun el alcance real de uso. Las altas, cobros y renovaciones se
          realizan de forma manual, sin pasarela automatica integrada, salvo que
          se comunique lo contrario en el futuro.
        </p>
      </Section>

      <Section title="4. Obligaciones del cliente">
        <ul className="list-disc space-y-2 pl-5">
          <li>Facilitar informacion veraz y actualizada.</li>
          <li>Custodiar credenciales y accesos de su equipo.</li>
          <li>Usar la plataforma conforme a la normativa aplicable.</li>
          <li>No intentar acceder a datos o espacios de terceros.</li>
          <li>No comprometer la seguridad o disponibilidad del servicio.</li>
        </ul>
      </Section>

      <Section title="5. Disponibilidad y soporte">
        <p>
          Trabajamos para mantener una disponibilidad alta del servicio, aunque
          podran existir mantenimientos, mejoras o incidencias no planificadas.
          Cuando sea posible, se comunicaran las intervenciones relevantes con
          antelacion razonable.
        </p>
      </Section>

      <Section title="6. Seguridad y aislamiento">
        <p>
          La plataforma aplica aislamiento por empresa, controles de acceso,
          trazabilidad y mecanismos de emergencia. Aun asi, ningun sistema
          conectado a internet puede garantizar riesgo cero.
        </p>
      </Section>

      <Section title="7. Propiedad intelectual">
        <p>
          El software, diseno, marca, documentacion y desarrollos vinculados al
          servicio son propiedad de {branding.companyName} o de sus
          licenciantes. El uso del servicio no transfiere derechos de propiedad
          intelectual al cliente.
        </p>
      </Section>

      <Section title="8. Suspension o cancelacion">
        <p>Podremos suspender o cancelar accesos en supuestos como:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Incumplimiento grave de estas condiciones.</li>
          <li>Uso fraudulento o inseguro de la plataforma.</li>
          <li>Impago de importes acordados.</li>
          <li>Peticion expresa del cliente o cierre del servicio.</li>
        </ul>
      </Section>

      <Section title="9. Limitacion de responsabilidad">
        <p>
          {branding.companyName} no sera responsable por danos indirectos,
          decisiones de negocio tomadas por el cliente ni por incidencias
          derivadas de factores externos fuera de control razonable.
        </p>
      </Section>

      <Section title="10. Modificaciones">
        <p>
          Podemos actualizar estas condiciones para reflejar cambios del
          producto, normativa o modelo de prestacion. Las modificaciones
          sustanciales se comunicaran por medios razonables.
        </p>
      </Section>
    </div>
  );
}
