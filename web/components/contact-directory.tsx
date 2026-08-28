"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ExternalLink, QrCode, X } from "lucide-react";
import type { ContactType, PublicContact, PublicSocialLink, SocialPlatform } from "@/lib/public-site";
import { PlatformIcon } from "./platform-icon";
import styles from "./contact-directory.module.css";

const contactLabels: Record<ContactType, string> = {
  WECHAT: "微信",
  QQ: "QQ",
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  PHONE: "电话",
  EMAIL: "邮箱",
};

const socialLabels: Record<SocialPlatform, string> = {
  GITHUB: "GitHub",
  X: "X",
  WEIBO: "微博",
  XIAOHONGSHU: "小红书",
  BILIBILI: "Bilibili",
  INSTAGRAM: "Instagram",
  DOUYIN: "抖音",
  WECHAT_CHANNELS: "视频号",
  YOUTUBE: "YouTube",
  WECHAT_OFFICIAL: "公众号",
};

export function ContactDirectory({ contacts, socialLinks }: { contacts: PublicContact[]; socialLinks: PublicSocialLink[] }) {
  const [activeQr, setActiveQr] = useState<PublicContact | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!activeQr) return;
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setActiveQr(null); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [activeQr]);

  if (contacts.length === 0 && socialLinks.length === 0) {
    return <div className={styles.empty}><h2>联系方式暂未配置</h2><p>作者启用公开渠道后会显示在这里。</p></div>;
  }

  return (
    <div className={styles.directory}>
      {contacts.length > 0 && (
        <section className={styles.section} aria-labelledby="contact-methods-title">
          <div className={styles.sectionHeading}><span>CONTACT</span><h2 id="contact-methods-title">联系方式</h2></div>
          <div className={styles.contactList}>
            {contacts.map((contact) => (
              <article className={styles.contactItem} key={contact.id}>
                <span className={styles.icon}><PlatformIcon platform={contact.contactType} /></span>
                <div><strong>{contactLabels[contact.contactType]}</strong><span>{contact.value}</span></div>
                <div className={styles.actions}>
                  {contact.href && <a href={contact.href} target={contact.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" aria-label={`通过${contactLabels[contact.contactType]}联系`}><ExternalLink aria-hidden="true" /></a>}
                  {contact.qrPublicUrl && <button type="button" aria-label={`查看${contactLabels[contact.contactType]}二维码`} onClick={() => setActiveQr(contact)}><QrCode aria-hidden="true" /></button>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {socialLinks.length > 0 && (
        <section className={styles.section} aria-labelledby="social-links-title">
          <div className={styles.sectionHeading}><span>SOCIAL</span><h2 id="social-links-title">社交平台</h2></div>
          <div className={styles.socialList}>
            {socialLinks.map((item) => {
              const content = <><span className={styles.icon}><PlatformIcon platform={item.platform} /></span><div><strong>{socialLabels[item.platform]}</strong><span>{item.accountName || "查看主页"}</span></div>{item.url && <ExternalLink className={styles.external} aria-hidden="true" />}</>;
              return item.url ? <a key={item.id} href={item.url} target="_blank" rel="noreferrer">{content}</a> : <div key={item.id}>{content}</div>;
            })}
          </div>
        </section>
      )}

      {activeQr?.qrPublicUrl && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveQr(null); }}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="qr-dialog-title">
            <button ref={closeRef} className={styles.close} type="button" aria-label="关闭二维码" onClick={() => setActiveQr(null)}><X aria-hidden="true" /></button>
            <span>SCAN / 扫码联系</span>
            <h2 id="qr-dialog-title">{contactLabels[activeQr.contactType]}</h2>
            <Image src={activeQr.qrPublicUrl} alt={`${contactLabels[activeQr.contactType]}二维码`} width={304} height={304} />
            <p>{activeQr.value}</p>
          </div>
        </div>
      )}
    </div>
  );
}
