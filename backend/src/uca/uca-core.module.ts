import { Global, Module } from "@nestjs/common";
import { UcaCoreService } from "./uca-core.service";

// global so that auth / user can report sign-ups and deletions without importing the control module
@Global()
@Module({ providers: [UcaCoreService], exports: [UcaCoreService] })
export class UcaCoreModule {}
