import { Transport, MicroserviceOptions } from '@nestjs/microservices';

export const tcpConfig: MicroserviceOptions = {
  transport: Transport.TCP,
  options: {
    host: '127.0.0.1',
    port: 4001,
  },
};
