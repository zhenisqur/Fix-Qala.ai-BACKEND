import { Injectable, NotFoundException } from '@nestjs/common';
import { Issue } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CLUSTER_RADIUS_M,
  Category,
  DEPARTMENTS,
  STATUS_TEXT,
  Status,
  computePriority,
  distanceMeters,
} from './rules';

export interface IncomingReport {
  category: string;
  lat: number;
  lng: number;
  title: string;
  address: string;
  photoUrl?: string;
  comment?: string;
}

@Injectable()
export class AgentService {
  constructor(private prisma: PrismaService) {}

  private log(issueId: string, action: string, details: string) {
    return this.prisma.agentLog.create({ data: { issueId, action, details } });
  }

  private saveReport(issueId: string, r: IncomingReport) {
    return this.prisma.report.create({
      data: { issueId, lat: r.lat, lng: r.lng, photoUrl: r.photoUrl, comment: r.comment },
    });
  }

  /** Новая жалоба от жителя: объединить, эскалировать или создать. */
  async handleReport(r: IncomingReport): Promise<Issue> {
    const sameCategory = await this.prisma.issue.findMany({ where: { category: r.category } });
    const near = sameCategory
      .map((i) => ({ i, d: distanceMeters(i.lat, i.lng, r.lat, r.lng) }))
      .filter((x) => x.d <= CLUSTER_RADIUS_M)
      .sort((a, b) => a.d - b.d)
      .map((x) => x.i);

    const open = near.find((i) => i.status !== 'done');
    if (open) return this.addConfirmation(open, r);

    const closed = near.find((i) => i.status === 'done');
    if (closed) {
      return this.escalate(closed, 'новая жалоба на том же месте после статуса «решено»', r);
    }

    return this.createIssue(r);
  }

  /** Кнопка «Подтверждаю» у существующего обращения. */
  async confirm(
    id: string,
    c: { lat: number; lng: number; photoUrl?: string; comment?: string },
  ): Promise<Issue> {
    const issue = await this.prisma.issue.findUnique({ where: { id } });
    if (!issue) throw new NotFoundException('Обращение не найдено');
    const r: IncomingReport = { ...c, category: issue.category, title: issue.title, address: issue.address };
    if (issue.status === 'done') {
      return this.escalate(issue, 'житель сообщил, что проблема осталась', r);
    }
    return this.addConfirmation(issue, r);
  }

  /** Вопрос жителю «Починили?». */
  async verify(id: string, fixed: boolean): Promise<Issue> {
    const issue = await this.prisma.issue.findUnique({ where: { id } });
    if (!issue) throw new NotFoundException('Обращение не найдено');
    if (fixed) {
      await this.log(id, 'verified', 'Житель подтвердил, что проблема устранена.');
      return issue;
    }
    return this.escalate(issue, 'житель сообщил, что проблема не устранена');
  }

  /** Служба меняет статус (из дашборда акимата). */
  async setStatus(id: string, status: Status): Promise<Issue> {
    const issue = await this.prisma.issue.findUnique({ where: { id } });
    if (!issue) throw new NotFoundException('Обращение не найдено');
    const updated = await this.prisma.issue.update({
      where: { id },
      data: { status, resolvedAt: status === 'done' ? new Date() : null },
    });
    await this.log(id, 'status_changed', `Служба изменила статус: ${STATUS_TEXT[status]}.`);
    if (status === 'done') {
      await this.log(id, 'verification_requested', 'Агент попросил жителей подтвердить, что проблема устранена.');
    }
    return updated;
  }

  private async createIssue(r: IncomingReport): Promise<Issue> {
    const issue = await this.prisma.issue.create({
      data: {
        title: r.title,
        category: r.category,
        lat: r.lat,
        lng: r.lng,
        address: r.address,
        photoUrl: r.photoUrl,
        priority: computePriority(r.category, 1),
        status: 'new',
        confirms: 1,
        reports: { create: { lat: r.lat, lng: r.lng, photoUrl: r.photoUrl, comment: r.comment } },
      },
    });
    await this.log(issue.id, 'received', `Принято обращение. Категория: ${r.category}.`);
    return this.dispatch(issue);
  }

  private async addConfirmation(issue: Issue, r: IncomingReport): Promise<Issue> {
    await this.saveReport(issue.id, r);
    const confirms = issue.confirms + 1;
    const priority = computePriority(issue.category, confirms, issue.escalations);
    const updated = await this.prisma.issue.update({
      where: { id: issue.id },
      data: { confirms, priority },
    });
    await this.log(
      issue.id,
      'clustered',
      `Жалоба объединена с существующим обращением (радиус ${CLUSTER_RADIUS_M} м). Подтверждений: ${confirms}.`,
    );
    if (priority !== issue.priority) {
      await this.log(issue.id, 'priority_changed', `Приоритет изменён: ${issue.priority} → ${priority}.`);
    }
    return updated;
  }

  private async escalate(issue: Issue, reason: string, r?: IncomingReport): Promise<Issue> {
    if (r) await this.saveReport(issue.id, r);
    const escalations = issue.escalations + 1;
    const confirms = issue.confirms + (r ? 1 : 0);
    const priority = computePriority(issue.category, confirms, escalations);
    const updated = await this.prisma.issue.update({
      where: { id: issue.id },
      data: { status: 'sent', resolvedAt: null, escalations, confirms, priority },
    });
    await this.log(
      issue.id,
      'escalated',
      `Проблема не устранена: ${reason}. Обращение открыто повторно, приоритет: ${priority}.`,
    );
    return this.dispatch(updated, true);
  }

  /** Автоматически формирует заявку и отправляет в нужную службу. */
  private async dispatch(issue: Issue, repeat = false): Promise<Issue> {
    const department = DEPARTMENTS[issue.category as Category] ?? 'Единый контакт-центр';
    const updated = await this.prisma.issue.update({
      where: { id: issue.id },
      data: { department, status: 'sent' },
    });
    const num = issue.id.slice(-6).toUpperCase();
    await this.log(
      issue.id,
      'dispatched',
      `${repeat ? 'Повторная заявка' : 'Заявка'} №${num} отправлена: ${department}. Приоритет: ${updated.priority}. Адрес: ${updated.address}.`,
    );
    return updated;
  }
}