// src/user/dto/create-user.dto.ts
import { IsString, IsEmail, IsNotEmpty, MaxLength, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  userName!: string;
 
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(1000)
  email!: string;
 
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  phone!: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(1000)
  photoURL!: string;
}
