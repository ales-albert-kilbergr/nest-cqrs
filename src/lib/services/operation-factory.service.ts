import { Constructor } from 'type-fest';
import {
  OperationBuilder,
  OperationBuilderBase,
  OperationBuilderLogger,
  OperationExecutor,
} from './operation-builder.service';
import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CommandLogger, QueryLogger } from './operation-logger.service';
import { OperationFailedExceptionFactory } from '../exceptions';
import { Command, Query } from '../decorators';

abstract class OperationFactory {
  constructor(
    private logger: OperationBuilderLogger<any, any>,
    private operationExecutor: OperationExecutor<any, any>,
  ) {}

  protected abstract getExceptionFactory<O extends object>(
    operationCtor: Constructor<O>,
  ): OperationFailedExceptionFactory<O, any> | undefined;

  public create<O extends object, R>(operationCtor: Constructor<O>) {
    const exceptionFactory = this.getExceptionFactory(operationCtor);

    if (!exceptionFactory) {
      throw new TypeError(
        'Missing exception factory. Did you forget to decorate the operation ' +
          'with a corresponding decorator @Command or @Query?',
      );
    }
    const builderBase = new OperationBuilderBase<O, R, any>(operationCtor);
    builderBase.setExecutor(this.operationExecutor);
    builderBase.setLogger(this.logger);
    builderBase.setExceptionFactory(exceptionFactory);

    const builderProxy = new Proxy<OperationBuilder<O, R>>(
      builderBase as OperationBuilder<O, R>,
      {
        get(target: any, prop: string | symbol) {
          return (...args: unknown[]) => {
            if (prop in target) {
              const result = Reflect.apply(target[prop], target, args);

              return result === builderBase ? builderProxy : result;
            } else {
              if (args.length === 0) {
                return builderBase.get(prop as keyof O);
              } else {
                builderBase.set(prop as keyof O, args[0] as O[keyof O]);
                return builderProxy;
              }
            }
          };
        },
      },
    );

    return builderProxy;
  }
}

@Injectable()
export class CommandFactory extends OperationFactory {
  constructor(logger: CommandLogger, commandBus: CommandBus) {
    super(logger, commandBus);
  }

  protected getExceptionFactory<O extends object>(
    operationCtor: Constructor<O>,
  ): OperationFailedExceptionFactory<O, any> | undefined {
    return Command.metadata.get(operationCtor)?.exceptionFactory as
      | Command.ExceptionFactory<O>
      | undefined;
  }
}

@Injectable()
export class QueryFactory extends OperationFactory {
  constructor(logger: QueryLogger, queryBus: QueryBus) {
    super(logger, queryBus);
  }

  protected getExceptionFactory<O extends object>(
    operationCtor: Constructor<O>,
  ): OperationFailedExceptionFactory<O, any> | undefined {
    return Query.metadata.get(operationCtor)?.exceptionFactory as
      | Query.ExceptionFactory<O>
      | undefined;
  }
}
