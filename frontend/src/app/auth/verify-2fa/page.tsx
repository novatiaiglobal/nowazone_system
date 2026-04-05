import { metadataForRoute } from '@/lib/seo';
import Verify2FAClient from './Verify2FAClient';

export async function generateMetadata() {
  return metadataForRoute('/auth/verify-2fa');
}

export default function Verify2FAPage() {
  return <Verify2FAClient />;
}
