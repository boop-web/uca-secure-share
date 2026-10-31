import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { EmailModule } from "src/email/email.module";
import { UserModule } from "src/user/user.module";
import { ControlController } from "./control.controller";
import { ControlService } from "./control.service";
import { SsoController } from "./sso.controller";

// ucagg.de's control API (/api/control/v1) and its two sign-in doors (/api/uca/admin-sso, /api/uca/id-sso)
@Module({
  imports: [AuthModule, UserModule, EmailModule],
  providers: [ControlService],
  controllers: [ControlController, SsoController],
})
export class UcaControlModule {}
