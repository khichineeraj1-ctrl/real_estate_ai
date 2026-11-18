import { Module } from '@nestjs/common';
import { AskController } from './ask/ask.controller';
import { AskService } from './ask/ask.service';
import { CatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { PrismaService } from './prisma/prisma.service';

@Module({
  controllers: [CatalogController, AskController],
  providers: [PrismaService, CatalogService, AskService],
})
export class AppModule {}
