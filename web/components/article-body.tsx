"use client";

import { MouseEvent, useEffect, useRef } from "react";
import styles from "./article-body.module.css";

export function ArticleBody({ html }: { html: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const buttons: HTMLButtonElement[] = [];
    body.querySelectorAll("pre").forEach((block) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = styles.copyButton;
      button.dataset.copyCode = "true";
      button.setAttribute("aria-label", "复制代码");
      button.textContent = "复制";
      block.prepend(button);
      buttons.push(button);
    });

    return () => buttons.forEach((button) => button.remove());
  }, [html]);

  const copyCode = async (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>("button[data-copy-code]")
      : null;
    if (!target) return;

    const code = target.parentElement?.querySelector("code")?.textContent;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      target.textContent = "已复制";
      window.setTimeout(() => { target.textContent = "复制"; }, 1600);
    } catch {
      target.textContent = "复制失败";
      window.setTimeout(() => { target.textContent = "复制"; }, 1600);
    }
  };

  return (
    <div
      ref={bodyRef}
      className={styles.body}
      onClick={(event) => void copyCode(event)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
