import { metadataForRoute } from '@/lib/seo';
import LockedClient from './LockedClient';

export async function generateMetadata() {
  return metadataForRoute('/auth/locked');
}

export default function LockedPage() {
  return <LockedClient />;
}
