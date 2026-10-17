import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

const digits = (s: string) => (s ?? '').replace(/\D/g, '');

class ClaimDto {
  @IsString()
  @MinLength(5)
  phone!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

class EditDto {
  @IsString()
  phone!: string;

  @IsString()
  @MaxLength(500)
  comment!: string;
}

@Controller()
export class MineController {
  constructor(private readonly prisma: PrismaService) {}

  // Привязывает только что созданный отчёт к номеру телефона автора
  @Post('issues/:id/claim')
  async claim(@Param('id') id: string, @Body() dto: ClaimDto) {
    const phone = digits(dto.phone);
    const issue = await this.prisma.issue.findUnique({ where: { id }, select: { id: true } });
    if (!issue) throw new NotFoundException('Issue not found');

    const fresh = await this.prisma.report.findFirst({
      where: { issueId: id, authorPhone: null },
      orderBy: { createdAt: 'desc' },
    });
    if (fresh && Date.now() - fresh.createdAt.getTime() < 60_000) {
      const r = await this.prisma.report.update({
        where: { id: fresh.id },
        data: { authorPhone: phone },
      });
      return { reportId: r.id };
    }
    const r = await this.prisma.report.create({
      data: { issueId: id, lat: dto.lat, lng: dto.lng, comment: dto.comment, authorPhone: phone },
    });
    return { reportId: r.id };
  }

  @Get('me/issues')
  async mine(@Query('phone') phone: string) {
    const p = digits(phone);
    if (p.length < 10) return [];
    return this.prisma.issue.findMany({
      where: { reports: { some: { authorPhone: p } } },
      orderBy: { updatedAt: 'desc' },
      include: {
        reports: {
          where: { authorPhone: p },
          orderBy: { createdAt: 'desc' },
          select: { id: true, comment: true, createdAt: true },
        },
      },
    });
  }

  @Patch('me/reports/:reportId')
  async edit(@Param('reportId') reportId: string, @Body() dto: EditDto) {
    await this.owned(reportId, dto.phone);
    await this.prisma.report.update({
      where: { id: reportId },
      data: { comment: dto.comment.trim() || null },
    });
    return { ok: true };
  }

  @Delete('me/reports/:reportId')
  async remove(@Param('reportId') reportId: string, @Query('phone') phone: string) {
    const r = await this.owned(reportId, phone);
    const issue = await this.prisma.issue.findUnique({ where: { id: r.issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    const left = issue.confirms - 1;
    if (left < 1) {
      // это было единственное обращение: убираем проблему целиком
      await this.prisma.$transaction([
        this.prisma.agentLog.deleteMany({ where: { issueId: issue.id } }),
        this.prisma.report.deleteMany({ where: { issueId: issue.id } }),
        this.prisma.photo.deleteMany({ where: { issueId: issue.id } }),
        this.prisma.issue.delete({ where: { id: issue.id } }),
      ]);
      return { deleted: 'issue' };
    }

    // проблему подтвердили и другие: снимаем только свой голос
    await this.prisma.$transaction([
      this.prisma.report.delete({ where: { id: r.id } }),
      this.prisma.issue.update({ where: { id: issue.id }, data: { confirms: left } }),
      this.prisma.agentLog.create({
        data: { issueId: issue.id, action: 'withdrawn', details: 'Житель отозвал своё подтверждение' },
      }),
    ]);
    return { deleted: 'report' };
  }

  private async owned(reportId: string, phone: string) {
    const r = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!r) throw new NotFoundException('Report not found');
    if (r.authorPhone !== digits(phone)) throw new ForbiddenException();
    return r;
  }
}