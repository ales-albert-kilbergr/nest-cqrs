import { Constructor } from 'type-fest';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  OperationFailedException,
  OperationFailedExceptionFactory,
} from '../exceptions';
import { Command, Query } from '../decorators';
import {
  CommandHandlerNotFoundException,
  QueryHandlerNotFoundException,
} from '@nestjs/cqrs';

export type OperationExecutor<C extends object, R> = {
  execute(query: C): Promise<R>;
};

export interface OperationBuilderLogger<
  O extends object,
  E extends OperationFailedException<O, any>,
> {
  logFailure(exception: OperationFailedException<O, E>, duration: number): void;

  logSuccess(operationType: string, duration: number): void;
}

export class OperationBuilderBase<
  O extends object,
  R,
  E extends OperationFailedExceptionFactory<O, any>,
> {
  private initState: Record<string, unknown> = {};

  private currState: Record<string, unknown> = {};

  private ctor: Constructor<O>;

  private executor?: OperationExecutor<O, R>;

  private logger?: OperationBuilderLogger<O, OperationFailedException<O>>;

  private exceptionFactory?: E;

  constructor(queryCtor: Constructor<O>) {
    this.ctor = queryCtor;
    // Load query defaults to the plain state
    this.initState = instanceToPlain(
      plainToInstance(this.ctor, {}, { exposeDefaultValues: true }),
    );

    this.clear();
  }

  public setExceptionFactory<E extends OperationFailedExceptionFactory<O, any>>(
    exceptionFactory: E,
  ): OperationBuilderBase<O, R, E> {
    const self = this as unknown as OperationBuilderBase<O, R, E>;
    self.exceptionFactory = exceptionFactory as any;

    return self;
  }

  public setExecutor(executor: OperationExecutor<O, R>): this {
    this.executor = executor;
    return this;
  }

  public setLogger(
    logger: OperationBuilderLogger<O, OperationFailedException<O>>,
  ): this {
    this.logger = logger;
    return this;
  }

  public clear(): this {
    for (const key of Object.keys(this.initState)) {
      if (typeof key === 'string') {
        this.currState[key] = Reflect.get(this.initState, key);
      }
    }

    return this;
  }

  public set<K extends keyof O>(key: K, value: O[K]): this {
    this.currState[key as string] = value;
    return this;
  }

  public get<K extends keyof O>(key: K): O[K] {
    return this.currState[key as string] as O[K];
  }

  public async build(): Promise<O> {
    const operation = plainToInstance(this.ctor, this.currState, {
      exposeDefaultValues: true,
    });

    const validationErrors = await validate(operation);

    /* istanbul ignore next */
    if (!this.exceptionFactory) {
      throw new Error('Operation exception factory is not set');
    }

    if (validationErrors.length > 0) {
      throw this.exceptionFactory.InvalidOperation(operation, validationErrors);
    }

    return operation;
  }

  public async execute(): Promise<R> {
    /* istanbul ignore next */
    if (!this.executor) {
      throw new Error('Operation executor is not set');
    }
    /* istanbul ignore next */
    if (!this.exceptionFactory) {
      throw new Error('Operation exception factory is not set');
    }

    const operation = await this.build();

    const executionStartedAt = process.hrtime.bigint();

    try {
      const result = await this.executor.execute(operation);

      if (this.logger) {
        const durationInMs = this.computeDurationInMs(executionStartedAt);
        this.logger.logSuccess(operation.constructor.name, durationInMs);
      }

      return result;
    } catch (error: unknown) {
      // Map the raised error or exception into appropriate OperationFailedException
      // or any of its children. The returned error can by string, number, error,
      // AggregateError or already an instance of OperationFailedException.
      const exception = this.mapToException(error, operation);

      if (this.logger) {
        const durationInMs = this.computeDurationInMs(executionStartedAt);
        this.logger.logFailure(exception, durationInMs);
      }

      throw exception;
    }
  }

  private computeDurationInMs(executionStartedAt: bigint): number {
    const executionEndedAt = process.hrtime.bigint();
    const executionTime = Number(executionEndedAt - executionStartedAt);
    const durationInMs = executionTime / 1e6;

    return durationInMs;
  }

  private mapToException(
    error: unknown,
    operation: O,
  ): OperationFailedException<O, any> {
    /* istanbul ignore next */
    if (!this.exceptionFactory) {
      throw new TypeError('Operation exception factory is not set');
    }

    if (error instanceof OperationFailedException) {
      return error;
    } else if (error instanceof CommandHandlerNotFoundException) {
      return this.exceptionFactory.HandlerNotFound(operation, error);
    } else if (error instanceof QueryHandlerNotFoundException) {
      return this.exceptionFactory.HandlerNotFound(operation, error);
    } else {
      return this.exceptionFactory.InternalHandlerError(
        operation,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}

export type OperationBuilder<O extends object, R> = {
  [K in keyof O]: {
    (value: O[K]): OperationBuilder<O, R>;
    (): O[K];
  };
} & {
  build: () => Promise<O>;
  clear: () => OperationBuilder<O, R>;
  execute: () => Promise<R>;
};

export type CommandBuilder<C extends object, R> = OperationBuilder<C, R>;

export class CommandBuilderBase<
  C extends object,
  R,
  E extends Command.ExceptionFactory<C, any>,
> extends OperationBuilderBase<C, R, E> {}

export type QueryBuilder<Q extends object, R> = OperationBuilder<Q, R>;

export class QueryBuilderBase<
  Q extends object,
  R,
  E extends Query.ExceptionFactory<Q, any>,
> extends OperationBuilderBase<Q, R, E> {}
