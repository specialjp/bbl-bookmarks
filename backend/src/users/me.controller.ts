import { Controller, Get, NotFoundException } from '@nestjs/common';

import { AuthUser } from '../auth/auth-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';

interface MeResponse {
  id: string;
  sub: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async getMe(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    const row = await this.users.findById(user.userId);
    if (!row) throw new NotFoundException();
    const { id, sub, email, name, createdAt, updatedAt } = row;
    return { id, sub, email, name, createdAt, updatedAt };
  }
}
