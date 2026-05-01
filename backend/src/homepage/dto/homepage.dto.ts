import { IsOptional, IsString } from "class-validator";

export class HomepageDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  bullet1Name?: string;

  @IsOptional()
  @IsString()
  bullet1Desc?: string;

  @IsOptional()
  @IsString()
  bullet2Name?: string;

  @IsOptional()
  @IsString()
  bullet2Desc?: string;

  @IsOptional()
  @IsString()
  bullet3Name?: string;

  @IsOptional()
  @IsString()
  bullet3Desc?: string;

  @IsOptional()
  @IsString()
  buttonText?: string;
}
