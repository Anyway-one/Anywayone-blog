import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContactDirectory } from "@/components/contact-directory";
import { SiteFooter } from "@/components/site-footer";
import { getPublicSite } from "@/lib/public-site";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "关于我",
  description: "联系 Anywayone。",
};

export default async function AboutPage() {
  const site = await getPublicSite();
  const profile = site?.profile;
  const publicName = profile?.publicName || "Anywayone";
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <Image
          className={styles.avatar}
          src={profile?.avatarPublicUrl || "/brand/anywayone-avatar.png"}
          alt={`${publicName} 头像`}
          width={260}
          height={260}
          loading="eager"
        />

        <section className={styles.copy} aria-labelledby="about-title">
          <p className={styles.kicker}>CONTACT / 关于我</p>
          <h1 id="about-title">联系 {publicName}<span>。</span></h1>
          <p className={styles.description}>
            {profile?.bio || "作者公开的联系方式与社交平台会显示在这里。"}
          </p>

          <ContactDirectory contacts={site?.contacts ?? []} socialLinks={site?.socialLinks ?? []} />

          <Link className={styles.backLink} href="/">
            <ArrowLeft aria-hidden="true" />
            返回首页
          </Link>
        </section>
      </div>
      <SiteFooter
        socialLinks={site?.socialLinks}
        launchDate={site?.settings?.launchDate}
        copyrightOwner={site?.profile.publicName}
      />
    </main>
  );
}
