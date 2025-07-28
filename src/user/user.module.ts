import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserTcpService } from './user-tcp.service';
import { KafkaModule } from '../config/kafka/kafka.module';

@Module({
  imports: [KafkaModule],
  controllers: [UserController],
  providers: [UserTcpService],
})
export class UserModule {}
