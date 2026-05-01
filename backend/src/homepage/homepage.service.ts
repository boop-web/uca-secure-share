import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class HomepageService {
  logger = new Logger(HomepageService.name);

  constructor(private prisma: PrismaService) {}

  async getHomePage() {
    let homePage = await this.prisma.homePage.findFirst();
    if (!homePage) {
      homePage = await this.prisma.homePage.create({
        data: {},
      });
    }
    return homePage;
  }

  async updateHomePage(data: any, userId: string) {
    let homePage = await this.prisma.homePage.findFirst();
    if (!homePage) {
      homePage = await this.prisma.homePage.create({
        data: { ...data, updatedBy: userId },
      });
    } else {
      homePage = await this.prisma.homePage.update({
        where: { id: homePage.id },
        data: { ...data, updatedBy: userId },
      });
    }
    return homePage;
  }
}
