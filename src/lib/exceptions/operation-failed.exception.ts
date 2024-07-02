import { ValidationError } from 'class-validator';

export type OperationFailedExceptionFactory<
  O extends object = object,
  E extends Error = Error,
> = typeof OperationFailedException<O, E>;

export class OperationFailedException<
  O extends object,
  E extends Error = Error,
> extends Error {
  public static operationType = 'Operation';

  public static errorCodes = {
    INTERNAL_HANDLER_ERROR: 'INTERNAL_HANDLER_ERROR',
    HANDLER_NOT_FOUND: 'HANDLER_NOT_FOUND',
    INVALID_OPERATION: 'INVALID_OPERATION',
  };

  constructor(
    public readonly code: string,
    public readonly operation: O,
    public readonly reason: string,
    public readonly origError?: E,
  ) {
    super(`Cqrs operation "${operation.constructor.name}" failed! ${reason}`);
  }

  public static HandlerNotFound<O extends object>(
    operation: O,
    origError: Error,
  ) {
    const queryName = operation.constructor.name;

    return new this(
      this.errorCodes.HANDLER_NOT_FOUND,
      operation,
      `Handler for ${this.operationType} "${queryName}" not found!`,
      origError,
    );
  }

  public static InternalHandlerError<O extends object>(
    operation: O,
    origError: Error,
  ) {
    const code = this.errorCodes.INTERNAL_HANDLER_ERROR;
    const origErrorMessage =
      origError instanceof AggregateError
        ? origError.errors.map((error) => error.message).join('\n')
        : 'errors' in (origError as any) &&
            Array.isArray((origError as any).errors)
          ? (origError as any).errors
              .map((error: any) => error.message)
              .join('\n')
          : origError.message;
    const message = `Internal handler error: ${origErrorMessage}`;

    return new this(code, operation, message, origError);
  }

  public static InvalidOperation<O extends object>(
    action: O,
    validationErrors: ValidationError[],
  ) {
    const validationMessages = validationErrors
      .map((error) => this.buildValidationErrorMessage(error))
      .join('\n');
    const message = `Invalid ${this.operationType}: ${validationMessages}`;

    return new this(
      this.errorCodes.INVALID_OPERATION,
      action,
      message,
      new AggregateError(validationErrors, `Validation failed!`),
    );
  }

  public static buildValidationErrorMessage(
    error: ValidationError,
    parentName = '',
  ) {
    const propertyName = parentName
      ? `${parentName}.${error.property}`
      : error.property;
    let message = `Validation of "${propertyName}" failed!`;

    const constraints = error.constraints
      ? '\n\t' +
        Reflect.ownKeys(error.constraints)
          .map((key) => `"${String(key)}": ${error.constraints![String(key)]}.`)
          .join('\n\t')
      : '';

    message += constraints;

    if (error.children && error.children.length > 0) {
      message +=
        '\n' +
        error.children
          .map((child) => this.buildValidationErrorMessage(child, propertyName))
          .join('\n\t');
    }

    return message;
  }
}

export class CommandFailedException<
  C extends object = object,
  E extends Error = Error,
> extends OperationFailedException<C, E> {
  /**
   *
   */
  public static operationType = 'Command';
  /**
   * Common error codes for the CommandFailedException and all its subclasses.
   */
  public static errorCodes = {
    ...OperationFailedException.errorCodes,
    /**
     * The command contains invalid data and cannot be executed. (Command
     * validation failed).
     */
    INVALID_OPERATION: 'INVALID_COMMAND',
  };
}

export class QueryFailedException<
  Q extends object = object,
  E extends Error = Error,
> extends OperationFailedException<Q, E> {
  /**
   *
   */
  public static operationType = 'Query';

  public static errorCodes = {
    ...OperationFailedException.errorCodes,
    INVALID_OPERATION: 'INVALID_QUERY',
  };
}
