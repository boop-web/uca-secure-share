import { Controller, Get, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { GetUser } from "src/auth/decorator/getUser.decorator";
import { AdministratorGuard } from "src/auth/guard/isAdmin.guard";
import { JwtGuard } from "src/auth/guard/jwt.guard";
import { ConfigService } from "src/config/config.service";
import { PrismaService } from "src/prisma/prisma.service";
import { fail } from "./control.service";
import { FULL_TEXT, PlanService, UPGRADE_TEXT, UPGRADE_URL } from "./plan.service";

/** UCA Share v2 for the website: the plans (public), the signed-in person's plan + space, the admin's disk status */
@Controller("uca")
export class PlanController {
  constructor(private plans: PlanService, private prisma: PrismaService, private config: ConfigService) {}

  /** public: what UCA Pro / UCA Max send, and whether uploads are open (the banner) */
  @Get("status")
  status() {
    const l = this.plans.limits();
    const d = this.plans.disk();
    return {
      disk: d.level, ...(d.level === "full" ? { message: FULL_TEXT } : {}),
      plans: { pro: { perLinkBytes: l.pro.perLink, storageBytes: l.pro.storage }, max: { perLinkBytes: l.max.perLink, storageBytes: l.max.storage } },
      maxDays: l.maxDays, maxDownloads: l.maxDownloads, upgrade: { text: UPGRADE_TEXT, url: UPGRADE_URL },
    };
  }

  /** the signed-in person: plan, limits now, space used by live links */
  @Get("me")
  @UseGuards(JwtGuard)
  async me(@GetUser() user?: User) {
    if (!user) throw fail(401, "Not signed in.");
    const p = await this.plans.planOf(user);
    const used = await this.plans.usedBytes(user.id);
    const live = await this.prisma.share.count({ where: this.plans.liveWhere(user.id) });
    return { email: user.email.toLowerCase(), plan: p.plan, planLabel: p.label, until: p.until, canSend: p.plan !== "none", disk: p.disk,
      ...(p.disk === "full" ? { message: FULL_TEXT } : {}),
      limits: { perLinkBytes: p.perLinkBytes, storageBytes: p.storageBytes, maxDays: p.maxDays, maxDownloads: p.maxDownloads, chunkBytes: Number(this.config.get("share.chunkSize")) },
      usedBytes: used, liveShares: live, ...(p.plan === "none" ? { upgrade: { text: UPGRADE_TEXT, url: UPGRADE_URL } } : {}), ...(p.unavailable ? { planUnavailable: true } : {}) };
  }

  /** Share's admin: the server's free disk (green / amber / red) */
  @Get("admin/disk")
  @UseGuards(JwtGuard, AdministratorGuard)
  disk() {
    return this.plans.disk(true);
  }
}
