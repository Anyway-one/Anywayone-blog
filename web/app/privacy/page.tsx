import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteFooter } from "@/components/public-site-footer";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "Anywayone 网站隐私政策。",
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.document}>
        <p className={styles.kicker}>PRIVACY / 隐私</p>
        <h1>隐私政策<span>。</span></h1>
        <p className={styles.updated}>更新日期：<time dateTime="2026-08-28">2026 年 8 月 28 日</time></p>

        <div className={styles.content}>
          <section>
            <h2>信息处理</h2>
            <p>本站目前不提供公开注册、评论或在线支付功能，也不会主动要求访客提交个人敏感信息。为保障站点安全和稳定运行，服务器可能会在有限期限内记录访问时间、请求地址、浏览器类型及 IP 地址等基础日志。</p>
          </section>
          <section>
            <h2>Cookie 与本地存储</h2>
            <p>公开浏览功能不依赖广告追踪 Cookie。若未来引入统计、个性化或第三方服务，本站会在本政策中说明其用途及相应选择。</p>
          </section>
          <section>
            <h2>第三方链接</h2>
            <p>本站可能包含社交平台或其他外部网站链接。访问第三方服务后，相关信息将由该服务依据其自身隐私规则处理，本站无法控制其行为。</p>
          </section>
          <section>
            <h2>联系与更新</h2>
            <p>如需查询、更正或删除与您有关的信息，可通过<Link href="/about">联系页面</Link>与本站联系。政策发生重要变化时，更新日期会同步调整。</p>
          </section>
        </div>
      </article>
      <PublicSiteFooter />
    </main>
  );
}
