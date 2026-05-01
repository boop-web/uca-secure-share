import { Module } from "@nestjs/common";
import { HomepageService } from "./homepage.service";
import { HomepageController } from "./homepage.controller";
import { PrismaService } from "src/prisma/prisma.service";
import { UserService } from "src/user/user.service";
import { JwtGuard } from "src/auth/guard/jwt.guard";

@Module({
  providers: [HomepageService, PrismaService, UserService, JwtGuard],
  controllers: [HomepageController],
  exports: [HomepageService],
})
export class HomepageModule {}
