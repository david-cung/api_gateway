import { KafkaOptions, Transport } from '@nestjs/microservices';

export const KafkaConfig: KafkaOptions = {
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: 'api-gateway',
      brokers: ['localhost:9092'],
    },
    consumer: {
      groupId: 'api-gateway-consumer',
    },
  },
};
