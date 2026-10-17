import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ConfirmDto, CreateIssueDto, StatusDto, VerifyDto } from './issue.dto';
import { IssuesService } from './issues.service';

function num(v?: string): number | undefined {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

@Controller('issues')
export class IssuesController {
  constructor(private issues: IssuesService) {}

  @Get()
  list(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    return this.issues.list(num(lat), num(lng));
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.issues.get(id);
  }

  @Post()
  create(@Body() dto: CreateIssueDto) {
    return this.issues.create(dto);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Body() dto: ConfirmDto) {
    return this.issues.confirm(id, dto);
  }

  @Post(':id/verify')
  verify(@Param('id') id: string, @Body() dto: VerifyDto) {
    return this.issues.verify(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.issues.setStatus(id, dto);
  }
}