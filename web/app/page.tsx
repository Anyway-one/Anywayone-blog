import { HomeExperience } from "@/components/home-experience";
import { getPublicSite } from "@/lib/public-site";
import { getPublicSystemStatus } from "@/lib/public-status";

export default async function HomePage() {
  const [site, status] = await Promise.all([getPublicSite(), getPublicSystemStatus()]);
  return <HomeExperience site={site} status={status} />;
}
