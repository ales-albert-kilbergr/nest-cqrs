import { Module } from '@nestjs/common';
import {
  CommandLogger,
  CommandFactory,
  QueryFactory,
  QueryLogger,
} from './services';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [CqrsModule],
  providers: [CommandFactory, CommandLogger, QueryFactory, QueryLogger],
  exports: [CommandFactory, QueryFactory],
})
export class CqrsFactoryModule {}
