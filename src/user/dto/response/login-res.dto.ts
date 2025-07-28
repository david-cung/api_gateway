import { Exclude, Expose } from 'class-transformer';

@Expose()
export class LoginResDto {
  @Exclude()
  message!: string;
}
