import { Injectable } from '@nestjs/common';
import { CreateUserResDto } from './dto/response';
import { KafkaProducerService } from '../config/kafka/producer.service';

@Injectable()
export class UserService {
  constructor(
    private readonly kafka: KafkaProducerService
  ) {}

   async createUser(userDto: any) {
    this.kafka.emit('user.created', userDto);
  }
}
