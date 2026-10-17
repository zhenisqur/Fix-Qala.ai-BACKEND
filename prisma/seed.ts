import { PrismaClient } from '@prisma/client';
import { Category, DEPARTMENTS, Status, computePriority } from '../src/agent/rules';

const prisma = new PrismaClient();

const items: {
  title: string;
  category: Category;
  lat: number;
  lng: number;
  address: string;
  confirms: number;
  status: Status;
}[] = [
  { title: 'Яма на проезжей части', category: 'road', lat: 51.128, lng: 71.43, address: 'ул. Туран, 12', confirms: 14, status: 'sent' },
  { title: 'Не горит фонарь у остановки', category: 'light', lat: 51.1335, lng: 71.4247, address: 'пр. Мангилик Ел, 30', confirms: 6, status: 'in_progress' },
  { title: 'Переполнен мусорный контейнер', category: 'trash', lat: 51.1211, lng: 71.4389, address: 'ул. Сыганак, 8', confirms: 2, status: 'new' },
  { title: 'Течёт канализационный люк', category: 'water', lat: 51.1402, lng: 71.4455, address: 'ул. Кенесары, 51', confirms: 9, status: 'sent' },
  { title: 'Разбитый тротуар', category: 'road', lat: 51.1301, lng: 71.4412, address: 'ул. Сарайшык, 5', confirms: 3, status: 'done' },
];

async function main() {
  await prisma.agentLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.issue.deleteMany();

  for (const i of items) {
    const priority = computePriority(i.category, i.confirms);
    const department = DEPARTMENTS[i.category];
    const issue = await prisma.issue.create({
      data: { ...i, priority, department, resolvedAt: i.status === 'done' ? new Date() : null },
    });
    await prisma.agentLog.createMany({
      data: [
        { issueId: issue.id, action: 'received', details: `Принято обращение. Категория: ${i.category}.` },
        { issueId: issue.id, action: 'dispatched', details: `Заявка отправлена: ${department}. Приоритет: ${priority}. Адрес: ${i.address}.` },
      ],
    });
  }
  console.log('Seed done');
}

main().finally(() => prisma.$disconnect());