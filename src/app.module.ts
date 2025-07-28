import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TcpModule } from './common/tcp/tcp.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TcpModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
  exports: [],
})
export class AppModule {}
