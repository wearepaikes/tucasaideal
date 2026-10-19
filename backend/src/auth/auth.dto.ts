import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AccessTokenDto {
  @IsString() @IsNotEmpty() accessToken!: string;
}

export class PendingTokenDto {
  @IsString() @IsNotEmpty() pendingToken!: string;
}

export class LoginDto extends AccessTokenDto {
  @IsEmail() @MaxLength(191) email!: string;
  @IsString() @IsNotEmpty() @MinLength(10) @MaxLength(128) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, { message: 'La contraseña debe incluir mayúscula, minúscula y número.' }) password!: string;
}

export class RegisterDto extends LoginDto {
  @IsString() @IsNotEmpty() @MaxLength(80) firstName!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) lastName!: string;
  @IsString() confirmPassword!: string;
}
