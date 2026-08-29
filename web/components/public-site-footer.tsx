import { getPublicSite } from "@/lib/public-site";
import { SiteFooter } from "./site-footer";

export async function PublicSiteFooter({ dark = false }: { dark?: boolean }) {
  const site = await getPublicSite();

  return (
    <SiteFooter
      dark={dark}
      settings={site?.settings}
      socialLinks={site?.socialLinks}
      launchDate={site?.settings?.launchDate}
      copyrightOwner={site?.profile.publicName}
    />
  );
}
