import { Type } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsInt,
  Max,
  Min,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { ShareSecurityDTO } from "./shareSecurity.dto";

export class CreateShareDTO {
  @IsString()
  @Matches("^[a-zA-Z0-9_-]*$", undefined, {
    message: "ID can only contain letters, numbers, underscores and hyphens",
  })
  @Length(3, 50)
  id: string;

  @Length(3, 30)
  @IsOptional()
  name: string;

  @IsString()
  expiration: string;

  @MaxLength(512)
  @IsOptional()
  description: string;

  @IsEmail({}, { each: true })
  recipients: string[];

  @ValidateNested()
  @Type(() => ShareSecurityDTO)
  security: ShareSecurityDTO;

  // UCA Share v2: "downloads" (ends after maxDownloads, at most 3 days) or "days" (ends after `days`)
  @IsOptional()
  @IsIn(["downloads", "days"])
  mode?: "downloads" | "days";

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxDownloads?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number;

  // all files together (bytes), so a link over the plan's size is refused before any upload
  @IsOptional()
  @IsInt()
  @Min(0)
  totalSize?: number;
}
