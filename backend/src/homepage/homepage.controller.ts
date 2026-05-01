import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
  Request,
  ForbiddenException,
} from "@nestjs/common";
import { HomepageService } from "./homepage.service";
import { HomepageDto } from "./dto/homepage.dto";
import { JwtGuard } from "src/auth/guard/jwt.guard";
import { UserService } from "src/user/user.service";

@Controller("homepage")
export class HomepageController {
  constructor(
    private homepageService: HomepageService,
    private userService: UserService,
  ) {}

  @Get()
  async getHomePage() {
    return this.homepageService.getHomePage();
  }

  @Put()
  @UseGuards(JwtGuard)
  async updateHomePage(@Body() dto: HomepageDto, @Request() req: any) {
    const user = await this.userService.get(req.user.sub);
    if (!user.isAdmin) {
      throw new ForbiddenException("Admin access required");
    }
    return this.homepageService.updateHomePage(dto, user.id);
  }
}
