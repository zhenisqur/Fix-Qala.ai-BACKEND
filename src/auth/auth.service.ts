import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

type Entry = { code: string; expires: number; attempts: number; lastSent: number };

@Injectable()
export class AuthService {
  private readonly log = new Logger('OTP');
  private readonly store = new Map<string, Entry>();
  // пока нет SMS-провайдера: код возвращается в ответе (для демо). OTP_MODE=sms в .env отключает это
  private readonly devMode = process.env.OTP_MODE !== 'sms';

  request(rawPhone: string) {
    const phone = rawPhone.replace(/\D/g, '');
    if (phone.length !== 11) throw new BadRequestException('Неверный номер');

    const prev = this.store.get(phone);
    if (prev && Date.now() - prev.lastSent < 20_000) {
      throw new HttpException('Слишком часто', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = String(Math.floor(1000 + Math.random() * 9000));
    this.store.set(phone, { code, expires: Date.now() + 5 * 60_000, attempts: 0, lastSent: Date.now() });
    this.send(phone, code);
    return this.devMode ? { ok: true, devCode: code } : { ok: true };
  }

  verify(rawPhone: string, code: string) {
    const phone = rawPhone.replace(/\D/g, '');
    const e = this.store.get(phone);
    if (!e || e.expires < Date.now()) throw new BadRequestException('Код истёк');
    if (e.attempts >= 5) {
      this.store.delete(phone);
      throw new BadRequestException('Слишком много попыток');
    }
    e.attempts++;
    if (e.code !== code) throw new BadRequestException('Неверный код');
    this.store.delete(phone);
    return { ok: true };
  }

  private send(phone: string, code: string) {
    // сюда подключается SMS-провайдер (Mobizon, SMSC.kz или Telegram Gateway)
    this.log.log(`Код для +${phone}: ${code}`);
  }
}