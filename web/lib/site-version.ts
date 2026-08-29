import webPackage from "../package.json";

export const siteVersion = process.env.NEXT_PUBLIC_SITE_VERSION?.trim() || webPackage.version;
