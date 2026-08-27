import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '12mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '12mb' });
  app.enableCors({
    origin: [
      'https://bdrms-web.vercel.app',   // production UI
      'http://localhost:3000'         // dev UI
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
  });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
