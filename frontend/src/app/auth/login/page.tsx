import { metadataForRoute } from '@/lib/seo';
import LoginClient from './LoginClient';

export async function generateMetadata() {
  return metadataForRoute('/auth/login');
}

export default function LoginPage() {
  return <LoginClient />;
}
