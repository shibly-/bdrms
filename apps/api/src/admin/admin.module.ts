import { Module } from '@nestjs/common';
import { LoadsModule } from '../loads/loads.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [LoadsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
