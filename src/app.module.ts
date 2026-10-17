import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AgentModule } from './agent/agent.module';
import { IssuesModule } from './issues/issues.module';
import { PhotosModule } from './photos/photos.module';
import { MineModule } from './mine/mine.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, AgentModule, IssuesModule, PhotosModule, MineModule, AuthModule],
})
export class AppModule {}