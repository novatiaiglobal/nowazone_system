import { metadataForRoute } from '@/lib/seo';
import VerifyEmailClient from './VerifyEmailClient';

export async function generateMetadata() {
  return metadataForRoute('/auth/verify-email');
}

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}
