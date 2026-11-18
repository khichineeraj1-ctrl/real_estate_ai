import { Module } from '@nestjs/common';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AskController } from './ask/ask.controller';
import { AskService } from './ask/ask.service';
import { CatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { PrismaService } from './prisma/prisma.service';

@Module({
  controllers: [CatalogController, AskController, AdminController],
  providers: [PrismaService, CatalogService, AskService, AdminService],
})
export class AppModule {}
