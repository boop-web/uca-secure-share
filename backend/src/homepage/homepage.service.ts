import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { HomepageDto } from "./dto/homepage.dto";

const HOMEPAGE_FIELDS: (keyof HomepageDto)[] = [
  "title",
  "description",
  "bullet1Name",
  "bullet1Desc",
  "bullet2Name",
  "bullet2Desc",
  "bullet3Name",
  "bullet3Desc",
  "buttonText",
];

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

  async updateHomePage(dto: HomepageDto, userId: string) {
    // only copy the known text fields
    const data: HomepageDto = {};
    for (const key of HOMEPAGE_FIELDS) {
      if (typeof dto[key] === "string") data[key] = dto[key];
    }
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
