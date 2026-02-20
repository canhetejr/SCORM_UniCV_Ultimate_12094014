import type { ComponentType } from "react";
import { ConfigEnv } from "./sections/ConfigEnv";
import { ConfigVimeo } from "./sections/ConfigVimeo";
import { ConfigLti } from "./sections/ConfigLti";
import { ConfigLrs } from "./sections/ConfigLrs";

export type ConfigModule = {
  id: string;
  title: string;
  order: number;
  Component: ComponentType;
};

export const configModules: ConfigModule[] = [
  { id: "env", title: "Dados do ambiente", order: 0, Component: ConfigEnv },
  { id: "vimeo", title: "Vimeo", order: 10, Component: ConfigVimeo },
  { id: "lti", title: "LTI 1.3 (Moodle)", order: 20, Component: ConfigLti },
  { id: "lrs", title: "LRS (xAPI)", order: 30, Component: ConfigLrs }
];
