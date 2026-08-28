import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteFooter } from "@/components/public-site-footer";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "服务条款",
  description: "Anywayone 网站服务条款。",
};

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <article className={styles.document}>
        <p className={styles.kicker}>TERMS / 条款</p>
        <h1>服务条款<span>。</span></h1>
        <p className={styles.updated}>更新日期：<time dateTime="2026-08-28">2026 年 8 月 28 日</time></p>

        <div className={styles.content}>
          <section>
            <h2>适用范围</h2>
            <p>访问或使用本站即表示您理解并同意本条款。若您不同意其中内容，请停止使用本站提供的页面与功能。</p>
          </section>
          <section>
            <h2>内容与知识产权</h2>
            <p>除非页面另有说明，本站原创文字、摄影作品、视觉设计及品牌素材的相关权利归本站作者所有。未经许可，不得将内容用于复制发行、商业推广、训练数据集或其他超出合理引用范围的用途。</p>
          </section>
          <section>
            <h2>合理使用</h2>
            <p>您可以通过正常浏览、分享原始页面链接及带有明确出处的少量引用使用本站内容。不得干扰站点运行、绕过访问限制、批量抓取内容，或利用本站从事违法和侵权活动。</p>
          </section>
          <section>
            <h2>服务变更与责任</h2>
            <p>本站内容仅供一般信息和个人表达参考，不构成专业建议。本站可能随时调整、暂停或终止部分内容，并会尽力维护准确性与可用性，但不对不可控原因导致的中断或损失作保证。</p>
          </section>
          <section>
            <h2>联系</h2>
            <p>对授权、转载或本条款有疑问，可通过<Link href="/about">联系页面</Link>与本站沟通。</p>
          </section>
        </div>
      </article>
      <PublicSiteFooter />
    </main>
  );
}
