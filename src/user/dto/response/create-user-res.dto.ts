// src/user/dto/create-user.dto.ts
import { Exclude, Expose } from 'class-transformer';

@Expose()
export class CreateUserResDto {
  @Exclude()
  id!: string;
}
