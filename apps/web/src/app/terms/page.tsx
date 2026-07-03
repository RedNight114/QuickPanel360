import { LegalLayout } from "@/components/marketing/legal-layout";
import { TermsDocument, legalLastUpdated } from "@/components/marketing/legal-documents";
import { branding } from "@/lib/branding";

export const metadata = {
  title: `Terminos y Condiciones - ${branding.appName}`,
  description: `Condiciones de uso del servicio ${branding.appName} operado por ${branding.companyName}.`,
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terminos y Condiciones" lastUpdated={legalLastUpdated}>
      <TermsDocument />
    </LegalLayout>
  );
}
