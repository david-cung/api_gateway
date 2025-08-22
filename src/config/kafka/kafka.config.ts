import { KafkaOptions, Transport } from '@nestjs/microservices';

export const KafkaConfig: KafkaOptions = {
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: 'api-gateway',
      brokers: ['kafka:9093'],
    },
    consumer: {
      groupId: 'api-gateway-consumer',
    },
  }, 
};
