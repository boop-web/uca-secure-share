import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { GetUser } from "src/auth/decorator/getUser.decorator";
import { AdministratorGuard } from "src/auth/guard/isAdmin.guard";
import { JwtGuard } from "src/auth/guard/jwt.guard";
import { HomepageDto } from "./dto/homepage.dto";
import { HomepageService } from "./homepage.service";

@Controller("homepage")
export class HomepageController {
  constructor(private homepageService: HomepageService) {}

  @Get()
  async getHomePage() {
    return this.homepageService.getHomePage();
  }

  @Put()
  @UseGuards(JwtGuard, AdministratorGuard)
  async updateHomePage(@Body() dto: HomepageDto, @GetUser() user: User) {
    return this.homepageService.updateHomePage(dto, user.id);
  }
}
