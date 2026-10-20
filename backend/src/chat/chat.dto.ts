import { IsArray, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateChatDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @IsEmail() @MaxLength(191) email!: string;
  @IsString() @IsNotEmpty() @MaxLength(30) phone!: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) message!: string;
}

export class ChatMessageDto {
  @IsString() @IsNotEmpty() @MaxLength(2000) message!: string;
}

export class UpdateChatDto {
  @IsOptional() @IsIn(['WAITING', 'ACTIVE', 'CLOSED']) status?: 'WAITING' | 'ACTIVE' | 'CLOSED';
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}
