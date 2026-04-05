import { metadataForRoute } from '@/lib/seo';
import HomeRedirect from './HomeRedirect';

export async function generateMetadata() {
  return metadataForRoute('/');
}

export default function Home() {
  return <HomeRedirect />;
}
