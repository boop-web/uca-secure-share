import { Global, Module } from "@nestjs/common";
import { DownloadsService } from "./downloads.service";
import { PlanService } from "./plan.service";
import { UcaCoreService } from "./uca-core.service";

// global so that auth / user can report sign-ups and deletions without importing the control module; the plan check
// (UCA Pro / UCA Max) and the download log are used by shares, files, the app API and the control API
@Global()
@Module({ providers: [UcaCoreService, PlanService, DownloadsService], exports: [UcaCoreService, PlanService, DownloadsService] })
export class UcaCoreModule {}
