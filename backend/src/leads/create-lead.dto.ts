import { IsIn, IsNotEmpty, IsPhoneNumber, IsString, MaxLength } from 'class-validator';

export class CreateLeadDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @IsString() @IsNotEmpty() @MaxLength(30) phone!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) model!: string;
  @IsIn(['Sí', 'No', 'Lo estoy buscando']) land!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) location!: string;
}
