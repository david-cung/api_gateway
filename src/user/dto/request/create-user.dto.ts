// src/user/dto/create-user.dto.ts
import { IsString, IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(1000)
  email!: string;
}
