export interface SiteChangelogEntry {
  date: string;
  title: string;
  summary: string;
  changes: string[];
}

export const siteChangelog: SiteChangelogEntry[] = [
  {
    date: "2026-08-29",
    title: "站点状态上线",
    summary: "新增公开服务状态入口，便于快速确认展示端、API 与数据库的运行情况。",
    changes: [
      "首页站点日志增加站点状态卡片。",
      "新增站点状态详情页与服务分组状态。",
      "新增面向访客的站点更新日志。",
    ],
  },
  {
    date: "2026-08-28",
    title: "访问统计与站点纪事",
    summary: "完善站点日志，让访问数据与站点成长记录拥有统一的展示入口。",
    changes: [
      "新增访客数、浏览量和近 30 天访客趋势。",
      "新增站点纪事时间线及后台维护能力。",
      "优化首页第二屏切换与页脚运行天数展示。",
    ],
  },
  {
    date: "2026-08-28",
    title: "摄影与个人资料",
    summary: "补齐摄影作品、个人资料、联系方式和社交平台等公开内容。",
    changes: [
      "新增摄影集的创建、发布、排序和公开浏览。",
      "新增个人资料、联系方式和社交平台管理。",
      "优化摄影图片压缩、去重与移除流程。",
    ],
  },
  {
    date: "2026-08-27",
    title: "博客基础能力完成",
    summary: "完成文章创作、发布、分类与公开阅读的核心体验。",
    changes: [
      "新增文章编辑、发布、撤回和公开详情页。",
      "新增分类、标签、封面与文章列表。",
      "新增 RSS、站点地图和基础 SEO 信息。",
    ],
  },
  {
    date: "2026-08-27",
    title: "Anywayone 正式启程",
    summary: "完成展示端、管理端和 API 的初始工程与自动部署链路。",
    changes: [
      "建立 Next.js 展示端与 React 管理端。",
      "建立 FastAPI、PostgreSQL 和管理员认证。",
      "接入容器化部署、HTTPS 和持续集成检查。",
    ],
  },
];
