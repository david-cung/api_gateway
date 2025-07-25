import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { KafkaConfig } from './config/kafka/kafka.config';
import { MicroserviceOptions } from '@nestjs/microservices';
import { tcpConfig } from './config/tcp/tcp.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice(KafkaConfig);
  app.connectMicroservice<MicroserviceOptions>(tcpConfig);

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
