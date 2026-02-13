export type ConfigStatus = {
  vimeo: { configured: boolean };
  lti: { platformConfigured: boolean; toolKeyConfigured: boolean };
  lrs: { configured: boolean };
};
