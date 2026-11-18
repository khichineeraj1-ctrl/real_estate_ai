import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  app.use(helmet());
  // The web app calls this API server-side; only the Expo web preview calls it from a browser, so CORS is open in development only.
  const origins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: origins?.length ? origins : process.env.NODE_ENV !== 'production' });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 4100, '0.0.0.0');
}
bootstrap();
