import { Module } from '@nestjs/common';

import { UserinfoClient } from '../auth/userinfo.client';
import { MeController } from './me.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [MeController],
  providers: [UsersService, UserinfoClient],
  exports: [UsersService],
})
export class UsersModule {}
