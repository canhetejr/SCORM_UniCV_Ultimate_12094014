export type Vitrine = {
  id: string;
  title: string;
  description: string | null;
  vimeoShowcaseId: string | null;
  vimeoSource: "MANUAL" | "VIMEO_SHOWCASE";
  createdAt: string;
  account?: { id: string; name: string };
  videoCount?: number;
};
