import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";
import * as moment from "moment";
import { PrismaService } from "src/prisma/prisma.service";
import { assertNotEnded } from "src/uca/downloads.service";

@Injectable()
export class ShareTokenSecurity implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request: Request = context.switchToHttp().getRequest();
    const shareId = Object.prototype.hasOwnProperty.call(
      request.params,
      "shareId",
    )
      ? request.params.shareId
      : request.params.id;

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      include: { security: true },
    });

    if (
      !share ||
      (moment().isAfter(share.expiration) &&
        !moment(share.expiration).isSame(0))
    )
      throw new NotFoundException("Share not found");
    await assertNotEnded(this.prisma, share, request);   // UCA Share v2: downloads used up

    return true;
  }
}
