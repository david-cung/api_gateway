// src/user/dto/create-user.dto.ts
import { IsString, IsEmail, IsNotEmpty, MaxLength, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  email!: string;
 
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
