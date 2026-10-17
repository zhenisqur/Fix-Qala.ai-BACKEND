import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';

@Module({
  imports: [AgentModule],
  controllers: [IssuesController],
  providers: [IssuesService],
})
export class IssuesModule {}