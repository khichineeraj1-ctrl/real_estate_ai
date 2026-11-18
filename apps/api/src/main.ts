import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { UPLOAD_DIR } from './admin/photos';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  // Photos are public and shown by the site and the app from other origins.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.useBodyParser('json', { limit: '2mb' }); // room for a bulk-import file
  // File names are random and never reused, so photos can be cached for good.
  app.useStaticAssets(UPLOAD_DIR, { prefix: '/uploads/', index: false, immutable: true, maxAge: '365d', dotfiles: 'ignore' });
  // The web app calls this API server-side; only the Expo web preview calls it from a browser, so CORS is open in development only.
  const origins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: origins?.length ? origins : process.env.NODE_ENV !== 'production' });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 4100, '0.0.0.0');
}
bootstrap();
