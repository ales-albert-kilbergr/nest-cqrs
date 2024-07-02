import { Metadata } from '@kilbergr/metadata';
import {
  CommandFailedException,
  OperationFailedExceptionFactory,
  QueryFailedException,
} from '../exceptions';

type MetadataWrapper<V> = Metadata<V>;

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace Operation {
  export type ExceptionFactory<
    O extends object = object,
    E extends Error = Error,
  > = OperationFailedExceptionFactory<O, E>;

  export type Metadata<
    E extends ExceptionFactory<any, any> = ExceptionFactory,
  > = {
    type: string;
    /**
     * A static factory to create variants of the operation failed exception.
     * The reason to reference a static factory instead of a type is that,
     * it allows to keep track of all factory methods.
     */
    exceptionFactory: E;
    description?: string;
  };

  export type Options<E extends ExceptionFactory<any, any> = ExceptionFactory> =
    {
      throws?: E;
      description?: string;
    };

  export type Decorator<
    E extends ExceptionFactory<any, any> = ExceptionFactory,
    O extends Options<E> = Options<E>,
  > = {
    (options?: O): ClassDecorator;
    metadata: MetadataWrapper<Metadata<E>>;
  };
}

function createOperationDecorator<
  E extends Operation.ExceptionFactory<any, any> = Operation.ExceptionFactory,
  O extends Operation.Options<E> = Operation.Options<E>,
>(
  metadataKey: string,
  defaultExceptionCtor: E,
  defaultOptions: O,
): Operation.Decorator<E, O> {
  const metadata = new Metadata<Operation.Metadata<E>>(metadataKey);

  function Operation(options: O = defaultOptions) {
    const operationExceptionCtor = options.throws || defaultExceptionCtor;

    return (target: any) => {
      const operationType = target.name;

      metadata.set(target, {
        type: operationType,
        exceptionFactory: operationExceptionCtor,
        description: options.description,
      });
    };
  }

  Operation.metadata = metadata;

  return Operation;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace Command {
  export type ExceptionFactory<
    C extends object = object,
    E extends Error = Error,
  > = typeof CommandFailedException<C, E>;

  export type Metadata<
    E extends ExceptionFactory<any, any> = ExceptionFactory,
  > = Operation.Metadata<E>;

  export type Options<E extends ExceptionFactory<any, any> = ExceptionFactory> =
    Operation.Options<E>;

  export type Decorator<
    E extends ExceptionFactory<any, any> = ExceptionFactory,
    O extends Options<E> = Options<E>,
  > = Operation.Decorator<E, O>;
}

export const Command = createOperationDecorator<
  Command.ExceptionFactory,
  Command.Options
>('command:exception', CommandFailedException, {});

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace Query {
  export type ExceptionFactory<
    Q extends object = object,
    E extends Error = Error,
  > = typeof QueryFailedException<Q, E>;

  export type Metadata<
    E extends ExceptionFactory<any, any> = ExceptionFactory,
  > = Operation.Metadata<E>;

  export type Options<E extends ExceptionFactory<any, any> = ExceptionFactory> =
    Operation.Options<E>;

  export type Decorator<
    E extends ExceptionFactory<any, any> = ExceptionFactory,
    O extends Options<E> = Options<E>,
  > = Operation.Decorator<E, O>;
}

export const Query = createOperationDecorator<
  Query.ExceptionFactory,
  Query.Options
>('query:exception', QueryFailedException, {});
