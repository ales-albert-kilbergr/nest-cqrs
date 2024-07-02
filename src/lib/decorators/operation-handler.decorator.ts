import { Metadata } from '@kilbergr/metadata';
import { Constructor } from 'type-fest';
import { QueryHandler as NestQueryHandler } from '@nestjs/cqrs';
import { CommandHandler as NestCommandHandler } from '@nestjs/cqrs';

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace OperationHandler {
  export type Metadata<O extends object> = {
    operationCtor: Constructor<O>;
  };
}

function createOperationHandlerDecorator<
  M extends OperationHandler.Metadata<any>,
>(
  metadataKey: string,
  nestHandlerDecorator: (operationCtor: Constructor<any>) => ClassDecorator,
) {
  const metadata = new Metadata<M>(metadataKey);

  function OperationHandler<T extends object>(
    operationCtor: Constructor<T>,
  ): ClassDecorator {
    const nestCommandHandlerFn = nestHandlerDecorator(operationCtor);
    return (target) => {
      nestCommandHandlerFn(target);
      metadata.set(target, { operationCtor });
    };
  }

  OperationHandler.metadata = metadata;

  return OperationHandler;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace QueryHandler {
  export type Metadata<C extends object> = OperationHandler.Metadata<C>;
}

export const QueryHandler = createOperationHandlerDecorator<
  QueryHandler.Metadata<any>
>('query-handler', NestQueryHandler);

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace CommandHandler {
  export type Metadata<C extends object> = OperationHandler.Metadata<C>;
}

export const CommandHandler = createOperationHandlerDecorator<
  CommandHandler.Metadata<any>
>('command-handler', NestCommandHandler);
