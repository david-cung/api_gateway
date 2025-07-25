import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TcpClient {
  constructor(private readonly client: ClientProxy) {}

  async send<TInput = any, TOutput = any>(pattern: string, data: TInput): Promise<TOutput> {
    return await firstValueFrom(this.client.send<TOutput, TInput>(pattern, data));
  }
}
