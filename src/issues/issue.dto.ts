import { IsBoolean, IsIn, IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';
import { CATEGORIES, STATUSES } from '../agent/rules';
import type { Category, Status } from '../agent/rules';
export class CreateIssueDto {
  @IsIn(CATEGORIES) category!: Category;
  @IsLatitude() lat!: number;
  @IsLongitude() lng!: number;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() comment?: string;
}

export class ConfirmDto {
  @IsLatitude() lat!: number;
  @IsLongitude() lng!: number;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() comment?: string;
}

export class VerifyDto {
  @IsBoolean() fixed!: boolean;
}

export class StatusDto {
  @IsIn(STATUSES) status!: Status;
}