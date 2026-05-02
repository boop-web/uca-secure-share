import { Module } from "@nestjs/common";
import { HomepageService } from "./homepage.service";
import { HomepageController } from "./homepage.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { UserModule } from "src/user/user.module";
import { AuthModule } from "src/auth/auth.module";
import { ConfigModule } from "src/config/config.module";

@Module({
  imports: [PrismaModule, UserModule, AuthModule, ConfigModule],
  providers: [HomepageService],
  controllers: [HomepageController],
  exports: [HomepageService],
})
export class HomepageModule {}
