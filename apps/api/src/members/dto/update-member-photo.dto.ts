import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMemberPhotoDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  photoStorageKey?: string;
}
