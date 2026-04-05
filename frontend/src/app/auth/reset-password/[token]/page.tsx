import { metadataForRoute } from '@/lib/seo';
import ResetPasswordClient from './ResetPasswordClient';

export async function generateMetadata() {
  return metadataForRoute('/auth/reset-password');
}

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
