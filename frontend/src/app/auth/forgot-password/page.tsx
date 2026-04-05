import { metadataForRoute } from '@/lib/seo';
import ForgotPasswordClient from './ForgotPasswordClient';

export async function generateMetadata() {
  return metadataForRoute('/auth/forgot-password');
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
