import { LegalDocumentScreen } from '@/components/legal/legal-document';
import { TERMS } from '@/content/legal';

export default function TermsScreen() {
  return <LegalDocumentScreen document={TERMS} />;
}
