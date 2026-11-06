import { LegalDocumentScreen } from '@/components/legal/legal-document';
import { PRIVACY_NOTICE } from '@/content/legal';

export default function PrivacyNoticeScreen() {
  return <LegalDocumentScreen document={PRIVACY_NOTICE} />;
}
