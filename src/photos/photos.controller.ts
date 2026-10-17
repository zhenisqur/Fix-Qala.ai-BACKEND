import {
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadPhotoDto } from './photos.dto';

@Controller('issues/:id/photo')
export class PhotosController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async upload(@Param('id') id: string, @Body() dto: UploadPhotoDto) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!issue) throw new NotFoundException('Issue not found');

    const [head, data] = dto.photo.split(',');
    const mime = head.slice(5, head.indexOf(';'));

    // первое фото обращения остаётся, повторные не перезаписывают
    await this.prisma.photo.upsert({
      where: { issueId: id },
      update: {},
      create: { issueId: id, mime, data },
    });
    return { ok: true };
  }

  @Get()
  @Header('Cache-Control', 'public, max-age=86400')
  async get(@Param('id') id: string) {
    const p = await this.prisma.photo.findUnique({ where: { issueId: id } });
    if (!p) throw new NotFoundException();
    return new StreamableFile(Buffer.from(p.data, 'base64'), { type: p.mime });
  }
}