import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "关于我",
  description: "联系 Anywayone。",
};

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <Image
          className={styles.avatar}
          src="/brand/anywayone-avatar.png"
          alt="Anywayone 头像"
          width={260}
          height={260}
          priority
        />

        <section className={styles.copy} aria-labelledby="about-title">
          <p className={styles.kicker}>CONTACT / 关于我</p>
          <h1 id="about-title">保持联系<span>。</span></h1>
          <p className={styles.description}>
            这个页面只承担联系职责。完整个人档案放在首页第二屏，联系方式由作者主动配置后显示。
          </p>

          <div className={styles.emptyContact}>
            <MessageCircle aria-hidden="true" />
            <div>
              <h2>联系方式暂未配置</h2>
              <p>邮箱、GitHub 或微信启用后会在这里出现；未配置渠道不会展示虚构账号。</p>
            </div>
          </div>

          <Link className={styles.backLink} href="/">
            <ArrowLeft aria-hidden="true" />
            返回首页
          </Link>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
