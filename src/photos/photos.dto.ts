import { IsString, Matches, MaxLength } from 'class-validator';

export class UploadPhotoDto {
  @IsString()
  @Matches(/^data:image\/(jpeg|png|webp);base64,/)
  @MaxLength(8_000_000)
  photo!: string;
}