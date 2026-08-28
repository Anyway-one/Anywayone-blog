"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { PublicPhotoItem } from "@/lib/public-photography";
import styles from "./photography-viewer.module.css";

export function PhotographyViewer({ items }: { items: PublicPhotoItem[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const current = selected === null ? null : items[selected];

  useEffect(() => {
    if (selected === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowLeft") setSelected((value) => value === null ? value : (value - 1 + items.length) % items.length);
      if (event.key === "ArrowRight") setSelected((value) => value === null ? value : (value + 1) % items.length);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", handleKey); };
  }, [items.length, selected]);

  return <>
    <section className={styles.stream} aria-label="摄影集照片">{items.map((item, index) => <figure className={styles.figure} key={item.id}>
      <button className={styles.imageButton} type="button" onClick={() => setSelected(index)} aria-label={`查看第 ${index + 1} 张照片`}>
        <Image src={item.publicUrl} alt={item.altText ?? item.title ?? ""} width={item.width} height={item.height} sizes="(max-width: 767px) 100vw, 920px" loading={index < 2 ? "eager" : "lazy"} />
        <span className={styles.expand}><Expand aria-hidden="true" /></span>
      </button>
      {(item.title || item.caption) && <figcaption>{item.title && <strong>{item.title}</strong>}{item.caption && <span>{item.caption}</span>}</figcaption>}
    </figure>)}</section>
    {current && selected !== null && <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={`查看照片 ${selected + 1} / ${items.length}`}>
      <button className={styles.close} type="button" onClick={() => setSelected(null)} aria-label="关闭大图"><X aria-hidden="true" /></button>
      <button className={`${styles.nav} ${styles.previous}`} type="button" onClick={() => setSelected((selected - 1 + items.length) % items.length)} aria-label="上一张"><ChevronLeft aria-hidden="true" /></button>
      <div className={styles.lightboxImage}><Image src={current.publicUrl} alt={current.altText ?? current.title ?? ""} fill sizes="100vw" priority style={{ objectFit: "contain" }} /></div>
      <button className={`${styles.nav} ${styles.next}`} type="button" onClick={() => setSelected((selected + 1) % items.length)} aria-label="下一张"><ChevronRight aria-hidden="true" /></button>
      <p className={styles.counter}>{String(selected + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</p>
    </div>}
  </>;
}
