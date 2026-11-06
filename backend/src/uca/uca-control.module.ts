import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { EmailModule } from "src/email/email.module";
import { ShareModule } from "src/share/share.module";
import { UserModule } from "src/user/user.module";
import { AppApiController, AppTokenGuard } from "./app-api.controller";
import { PlanController } from "./plan.controller";
import { ControlController } from "./control.controller";
import { ControlService } from "./control.service";
import { SsoController } from "./sso.controller";

// ucagg.de's control API (/api/control/v1), its two sign-in doors (/api/uca/admin-sso, /api/uca/id-sso), the plan
// endpoints for the website (/api/uca/status, /api/uca/me) and the app API for other UCA apps (/api/app/v1, uca-share-v1)
@Module({
  imports: [AuthModule, UserModule, EmailModule, ShareModule],
  providers: [ControlService, AppTokenGuard],
  controllers: [ControlController, SsoController, PlanController, AppApiController],
})
export class UcaControlModule {}
