import { HomeExperience } from "@/components/home-experience";
import { getPublicSite } from "@/lib/public-site";

export default async function HomePage() {
  const site = await getPublicSite();
  return <HomeExperience site={site} />;
}
