import { Module } from '@nestjs/common';
import { MineController } from './mine.controller';

@Module({ controllers: [MineController] })
export class MineModule {}