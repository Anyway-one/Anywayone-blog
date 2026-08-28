import { getPublicSite } from "@/lib/public-site";
import { SiteFooter } from "./site-footer";

export async function PublicSiteFooter({ dark = false }: { dark?: boolean }) {
  const site = await getPublicSite();

  return <SiteFooter dark={dark} socialLinks={site?.socialLinks} />;
}
