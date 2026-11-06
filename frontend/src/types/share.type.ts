import User from "./user.type";

export type Share = {
  id: string;
  name?: string;
  files: any;
  creator?: User;
  description?: string;
  expiration: Date;
  size: number;
  hasPassword: boolean;
  mode?: "downloads" | "days" | null;
  maxDownloads?: number | null;
  downloads?: number;
};

export type CompletedShare = Share & {
  /**
   * undefined means is not reverse share
   * true means server was send email to reverse share creator
   * false means server was not send email to reverse share creator
   * */
  notifyReverseShareCreator: boolean | undefined;
};

export type CreateShare = {
  id: string;
  name?: string;
  description?: string;
  recipients: string[];
  expiration: string;
  security: ShareSecurity;
  // UCA Share v2: the link's mode (the server sets the expiry from it)
  mode?: "downloads" | "days";
  maxDownloads?: number;
  days?: number;
  totalSize?: number;
};

export type ShareMetaData = {
  id: string;
  isZipReady: boolean;
};

export type MyShare = Omit<Share, "hasPassword"> & {
  views: number;
  createdAt: Date;
  security: MyShareSecurity;
  endedAt?: string | null;
  downloadLog?: { n: number; at: string; device: string }[];
};

export type MyReverseShare = {
  id: string;
  maxShareSize: string;
  shareExpiration: Date;
  remainingUses: number;
  token: string;
  shares: MyShare[];
};

export type ShareSecurity = {
  maxViews?: number;
  password?: string;
};

export type MyShareSecurity = {
  passwordProtected: boolean;
  maxViews: number;
};
