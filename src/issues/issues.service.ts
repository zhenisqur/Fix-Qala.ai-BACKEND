import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentService } from '../agent/agent.service';
import { CATEGORY_LABEL, distanceMeters } from '../agent/rules';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmDto, CreateIssueDto, StatusDto, VerifyDto } from './issue.dto';

@Injectable()
export class IssuesService {
  constructor(
    private prisma: PrismaService,
    private agent: AgentService,
  ) {}

  async list(lat?: number, lng?: number) {
    const issues = await this.prisma.issue.findMany({ orderBy: { createdAt: 'desc' } });
    const hasPoint = lat !== undefined && lng !== undefined;
    const result = issues.map((i) => ({
      ...i,
      distanceM: hasPoint ? Math.round(distanceMeters(lat, lng, i.lat, i.lng)) : null,
    }));
    if (hasPoint) result.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
    return result;
  }

  async get(id: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: { logs: { orderBy: { createdAt: 'asc' } }, reports: true },
    });
    if (!issue) throw new NotFoundException('Обращение не найдено');
    return issue;
  }

  create(dto: CreateIssueDto) {
    return this.agent.handleReport({
      category: dto.category,
      lat: dto.lat,
      lng: dto.lng,
      title: dto.title?.trim() || CATEGORY_LABEL[dto.category],
      address: dto.address?.trim() || `${dto.lat.toFixed(4)}, ${dto.lng.toFixed(4)}`,
      photoUrl: dto.photoUrl,
      comment: dto.comment,
    });
  }

  confirm(id: string, dto: ConfirmDto) {
    return this.agent.confirm(id, dto);
  }

  verify(id: string, dto: VerifyDto) {
    return this.agent.verify(id, dto.fixed);
  }

  setStatus(id: string, dto: StatusDto) {
    return this.agent.setStatus(id, dto.status);
  }
}