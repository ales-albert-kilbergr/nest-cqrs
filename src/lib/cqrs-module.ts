import { Module } from '@nestjs/common';
import {
  CommandLogger,
  CommandFactory,
  QueryFactory,
  QueryLogger,
} from './services';

@Module({
  providers: [CommandFactory, CommandLogger, QueryFactory, QueryLogger],
  exports: [],
})
export class CqrsFactory {}
