import { LegalLayout } from "@/components/marketing/legal-layout";
import { PrivacyDocument, legalLastUpdated } from "@/components/marketing/legal-documents";
import { branding } from "@/lib/branding";

export const metadata = {
  title: `Politica de Privacidad - ${branding.appName}`,
  description: `Informacion sobre como ${branding.companyName} trata los datos personales en ${branding.appName}.`,
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Politica de Privacidad" lastUpdated={legalLastUpdated}>
      <PrivacyDocument />
    </LegalLayout>
  );
}
