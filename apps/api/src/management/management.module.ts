import { Module } from '@nestjs/common';
import { ManagementController } from './management.controller';

@Module({
  controllers: [ManagementController],
})
export class ManagementModule {}
