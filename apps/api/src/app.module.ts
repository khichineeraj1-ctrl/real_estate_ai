import { Module } from '@nestjs/common';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { Reminders } from './admin/reminders';
import { AskController } from './ask/ask.controller';
import { AskService } from './ask/ask.service';
import { CatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { Mailer } from './mail/mailer';
import { PrismaService } from './prisma/prisma.service';

@Module({
  controllers: [CatalogController, AskController, AdminController],
  providers: [PrismaService, Mailer, CatalogService, AskService, AdminService, Reminders],
})
export class AppModule {}
