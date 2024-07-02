import { Injectable, Logger, Optional } from '@nestjs/common';
import { OperationBuilderLogger } from './operation-builder.service';
import { OperationFailedException } from '../exceptions';
/**
 * The base interface for all operation log messages.
 */
export interface OperationLogMessage {
  /**
   * Describes what kind of cqrs operation was performed. (command or query)
   */
  kind: 'command' | 'query';
  /**
   * Describe the operation that was performed. (Name of the command or query)
   */
  name: string;
  /**
   * Describe the type of the log message. (Do we log a failure, or a success?)
   */
  type: 'success' | 'error';
}
/**
 * The interface for a successful operation log message.
 */
export interface OperationSuccessLogMessage extends OperationLogMessage {
  /**
   * Describes the duration of the operation in milliseconds.
   */
  duration: number;
}

export interface OperationFailedLogMessage extends OperationLogMessage {
  /**
   * Describes the duration of the operation in milliseconds.
   */
  duration: number;
  /**
   * Describes the error code of the operation.
   */
  errorCode: string;
  /**
   * Describes the error message of the operation.
   */
  errorMessage: string;
}

export interface OperationLog<R extends OperationLogMessage> {
  message: string;
  cqrs: R;
}

class OperationLogger implements OperationBuilderLogger<any, any> {
  constructor(
    public readonly logger: Logger,
    private readonly operationKind: 'command' | 'query',
  ) {}

  /**
   * Creates a structured log message.
   *
   * @param message
   * @param payload
   * @returns
   */
  public createLogMessage<R extends OperationLogMessage>(
    message: string,
    payload: Omit<R, 'kind'>,
  ): OperationLog<R> {
    const capitalizedKind =
      this.operationKind.charAt(0).toUpperCase() + this.operationKind.slice(1);
    return {
      message: `${capitalizedKind} ${message}`,
      cqrs: {
        kind: this.operationKind,
        ...payload,
      } as R,
    };
  }

  public logSuccess(operationType: string, duration: number): void {
    this.logger.log(
      this.createLogMessage<OperationSuccessLogMessage>(
        `"${operationType}" succeeded in ${duration}ms`,
        {
          name: operationType,
          type: 'success',
          duration,
        },
      ),
    );
  }

  public logFailure(
    exception: OperationFailedException<any, any>,
    duration: number,
  ): void {
    this.logger.error(
      this.createLogMessage<OperationFailedLogMessage>(
        `"${exception.operation.constructor.name}" failed after ` +
          `${duration}ms with code "${exception.code}" and a reason ` +
          `"${exception.message}"`,
        {
          name: exception.operation.constructor.name,
          type: 'error',
          duration,
          errorCode: exception.code,
          errorMessage: exception.message,
        },
      ),
    );
  }
}

@Injectable()
export class CommandLogger extends OperationLogger {
  constructor(@Optional() logger: Logger = new Logger('cqrs')) {
    super(logger, 'command');
  }
}

@Injectable()
export class QueryLogger extends OperationLogger {
  constructor(@Optional() logger: Logger = new Logger('cqrs')) {
    super(logger, 'query');
  }
}
