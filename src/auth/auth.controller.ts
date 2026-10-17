import { Body, Controller, Post } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { AuthService } from './auth.service';

class RequestCodeDto {
  @IsString()
  phone!: string;
}

class VerifyCodeDto {
  @IsString()
  phone!: string;

  @IsString()
  @Length(4, 4)
  code!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('request-code')
  requestCode(@Body() dto: RequestCodeDto) {
    return this.auth.request(dto.phone);
  }

  @Post('verify-code')
  verifyCode(@Body() dto: VerifyCodeDto) {
    return this.auth.verify(dto.phone, dto.code);
  }
}