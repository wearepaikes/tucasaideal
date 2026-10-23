import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @IsString() @IsNotEmpty() @MaxLength(60) status!: string;
  @IsOptional() @IsString() @MaxLength(500) coverSelection?: string;
}

export class UpdateProjectDto extends CreateProjectDto {
  @IsOptional() @IsString() existingPhotos?: string;
  @IsOptional() @IsString() existingPanoramas?: string;
}

export class CreateWorkDto {
  @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @Type(() => Number) @IsInt() @IsIn([18, 30, 42, 52]) area!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(30) bedrooms!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(30) bathrooms!: number;
  @IsString() @IsNotEmpty() @MaxLength(30) status!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) location!: string;
  @IsOptional() @IsString() @MaxLength(500) coverSelection?: string;
  @IsOptional() @IsString() @MaxLength(255) youtubeId?: string;
}

export class UpdateWorkDto extends CreateWorkDto {
  @IsOptional() @IsString() existingPhotos?: string;
  @IsOptional() @IsString() existingPanoramas?: string;
}

export class ToggleActiveDto {
  @IsBoolean() active!: boolean;
}

export class UpdateLeadStatusDto {
  @IsIn(['NEW', 'CONTACTED']) status!: 'NEW' | 'CONTACTED';
}

export class BusinessProfileDto {
  @IsIn(['AUTOMATIC', 'MANUAL']) mode!: 'AUTOMATIC' | 'MANUAL';
  @ValidateIf((dto) => dto.mode === 'AUTOMATIC') @IsDateString() startDate?: string;
  @ValidateIf((dto) => dto.mode === 'MANUAL') @IsInt() @Min(0) @Max(200) manualYears?: number;
}

export class HouseCountProfileDto {
  @IsIn(['AUTOMATIC', 'MANUAL']) mode!: 'AUTOMATIC' | 'MANUAL';
  @ValidateIf((dto) => dto.mode === 'MANUAL') @IsInt() @Min(0) @Max(1000000) manualCount?: number;
}

export class CreateGoogleReviewDto {
  @IsString() @IsNotEmpty() @MaxLength(120) author!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @IsString() @IsNotEmpty() @MaxLength(3000) text!: string;
  @IsOptional() @IsDateString() reviewDate?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateGoogleReviewDto extends CreateGoogleReviewDto {}
