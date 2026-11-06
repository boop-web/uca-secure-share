import { Injectable } from "@nestjs/common";
import { LocalFileService } from "./local.service";
import { S3FileService } from "./s3.service";
import { ConfigService } from "src/config/config.service";
import { Readable } from "stream";
import { PrismaService } from "../prisma/prisma.service";
import { PlanService } from "src/uca/plan.service";

@Injectable()
export class FileService {
  constructor(
    private prisma: PrismaService,
    private localFileService: LocalFileService,
    private s3FileService: S3FileService,
    private configService: ConfigService,
    private plans: PlanService,
  ) {}

  // Determine which service to use based on the current config value
  // shareId is optional -> can be used to overwrite a storage provider
  private getStorageService(
    storageProvider?: string,
  ): S3FileService | LocalFileService {
    if (storageProvider != undefined)
      return storageProvider == "S3"
        ? this.s3FileService
        : this.localFileService;
    return this.configService.get("s3.enabled")
      ? this.s3FileService
      : this.localFileService;
  }

  async create(
    data: string,
    chunk: { index: number; total: number },
    file: {
      id?: string;
      name: string;
    },
    shareId: string,
    user?: { id: string; email: string; isAdmin: boolean },
  ) {
    // the server's disk is nearly full: uploads pause (downloads keep working)
    this.plans.assertDiskOpen();
    // UCA Share v2: a share of a signed-in sender stays within the plan's size per link and the sender's space
    const share = await this.prisma.share.findUnique({ where: { id: shareId }, select: { creatorId: true, files: { select: { size: true } } } });
    if (share?.creatorId) {
      const owner = user && user.id === share.creatorId ? user : await this.prisma.user.findUnique({ where: { id: share.creatorId } });
      if (owner) {
        const done = share.files.reduce((n, f) => n + (parseInt(f.size) || 0), 0);
        const chunkSize = Number(this.configService.get("share.chunkSize")) || 0;
        const len = Buffer.isBuffer(data) ? (data as unknown as Buffer).length : Buffer.byteLength(String(data || ""), "base64");
        await this.plans.assertRoom(owner, shareId, done + Math.max(0, chunk.index) * chunkSize + len);
      }
    }
    const storageService = this.getStorageService();
    return storageService.create(data, chunk, file, shareId);
  }

  async get(shareId: string, fileId: string): Promise<File> {
    const share = await this.prisma.share.findFirst({
      where: { id: shareId },
    });
    const storageService = this.getStorageService(share.storageProvider);
    return storageService.get(shareId, fileId);
  }

  async remove(shareId: string, fileId: string) {
    const storageService = this.getStorageService();
    return storageService.remove(shareId, fileId);
  }

  async deleteAllFiles(shareId: string) {
    const storageService = this.getStorageService();
    return storageService.deleteAllFiles(shareId);
  }

  async getZip(shareId: string): Promise<Readable> {
    const storageService = this.getStorageService();
    return await storageService.getZip(shareId);
  }

  private async streamToUint8Array(stream: Readable): Promise<Uint8Array> {
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
      stream.on("error", reject);
    });
  }
}

export interface File {
  metaData: {
    id: string;
    size: string;
    createdAt: Date;
    mimeType: string | false;
    name: string;
    shareId: string;
  };
  file: Readable;
}
