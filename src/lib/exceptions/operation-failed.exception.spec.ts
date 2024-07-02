import { CommandHandlerNotFoundException } from '@nestjs/cqrs';
import {
  CommandFailedException,
  QueryFailedException,
} from './operation-failed.exception';

describe('(Unit) Operation Failed Exception', () => {
  describe('(Unit) CommandFailedException', () => {
    describe('#constructor()', () => {
      it('should add the command type into the error message', () => {
        // Arrange
        class TestCommand {}
        // Act
        const exception = new CommandFailedException(
          CommandFailedException.errorCodes.INTERNAL_HANDLER_ERROR,
          new TestCommand(),
          'Test reason',
        );
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestCommand" failed! Test reason',
        );
      });
    });

    describe('InvalidCommand()', () => {
      it('should build a message from a validation error without constraints', () => {
        // Arrange
        const error = {
          property: 'name',
          children: [],
        };
        class TestCommand {}
        const command = new TestCommand();
        // Act
        const exception = CommandFailedException.InvalidOperation(command, [
          error,
        ]);
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestCommand" failed! ' +
            'Invalid Command: Validation of "name" failed!',
        );
      });

      it('should build a message from a validation error with constraints', () => {
        // Arrange
        const error = {
          property: 'name',
          constraints: {
            isNotEmpty: 'name should not be empty',
          },
        };
        class TestCommand {}
        const command = new TestCommand();
        // Act
        const exception = CommandFailedException.InvalidOperation(command, [
          error,
        ]);
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestCommand" failed! ' +
            'Invalid Command: Validation of "name" failed!' +
            '\n\t"isNotEmpty": name should not be empty.',
        );
      });

      it('should build a message from a validation error with children', () => {
        // Arrange
        const error = {
          property: 'name',
          children: [
            {
              property: 'length',
              constraints: {
                isNotEmpty: 'length should not be empty',
              },
            },
          ],
        };
        class TestCommand {}
        const command = new TestCommand();
        // Act
        const exception = CommandFailedException.InvalidOperation(command, [
          error,
        ]);
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestCommand" failed! ' +
            'Invalid Command: Validation of "name" failed!' +
            '\nValidation of "name.length" failed!' +
            '\n\t"isNotEmpty": length should not be empty.',
        );
      });
    });

    describe('InternalHandlerError()', () => {
      it('should join messages from AggregateError', () => {
        // Arrange
        const error = new AggregateError([
          new Error('Error 1'),
          new Error('Error 2'),
        ]);
        class TestCommand {}
        const command = new TestCommand();
        // Act
        const exception = CommandFailedException.InternalHandlerError(
          command,
          error,
        );
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestCommand" failed! Internal handler error: ' +
            'Error 1\nError 2',
        );
      });

      it('should join messages from an errors property on an error object', () => {
        // Arrange
        class CustomError extends Error {
          public errors: Error[];
          constructor(errors: Error[]) {
            super('Custom error');
            this.errors = errors;
          }
        }
        const error = new CustomError([
          new Error('Error 1'),
          new Error('Error 2'),
        ]);
        class TestCommand {}
        const command = new TestCommand();
        // Act
        const exception = CommandFailedException.InternalHandlerError(
          command,
          error,
        );
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestCommand" failed! Internal handler error: ' +
            'Error 1\nError 2',
        );
      });

      it('should read the message from an error object', () => {
        // Arrange
        const error = new Error('Custom error');
        class TestCommand {}
        const command = new TestCommand();
        // Act
        const exception = CommandFailedException.InternalHandlerError(
          command,
          error,
        );
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestCommand" failed! Internal handler error: Custom error',
        );
      });
    });

    describe('HandlerNotFound()', () => {
      it('should build a message with the command name', () => {
        // Arrange
        class TestCommand {}
        const command = new TestCommand();
        // Act
        const exception = CommandFailedException.HandlerNotFound(
          command,
          new CommandHandlerNotFoundException('TestCommand'),
        );
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestCommand" failed! Handler for Command "TestCommand" not found!',
        );
      });
    });
  });

  describe('(Unit) QueryFailedException', () => {
    describe('#constructor()', () => {
      it('should add the query type into the error message', () => {
        // Arrange
        class TestQuery {}
        // Act
        const exception = new QueryFailedException(
          QueryFailedException.errorCodes.INTERNAL_HANDLER_ERROR,
          new TestQuery(),
          'Test reason',
        );
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestQuery" failed! Test reason',
        );
      });
    });

    describe('InvalidQuery()', () => {
      it('should build a message from a validation error without constraints', () => {
        // Arrange
        const error = {
          property: 'name',
          children: [],
        };
        class TestQuery {}
        const query = new TestQuery();
        // Act
        const exception = QueryFailedException.InvalidOperation(query, [error]);
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestQuery" failed! ' +
            'Invalid Query: Validation of "name" failed!',
        );
      });

      it('should build a message from a validation error with constraints', () => {
        // Arrange
        const error = {
          property: 'name',
          constraints: {
            isNotEmpty: 'name should not be empty',
          },
        };
        class TestQuery {}
        const query = new TestQuery();
        // Act
        const exception = QueryFailedException.InvalidOperation(query, [error]);
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestQuery" failed! ' +
            'Invalid Query: Validation of "name" failed!' +
            '\n\t"isNotEmpty": name should not be empty.',
        );
      });

      it('should build a message from a validation error with children', () => {
        // Arrange
        const error = {
          property: 'name',
          children: [
            {
              property: 'length',
              constraints: {
                isNotEmpty: 'length should not be empty',
              },
            },
          ],
        };
        class TestQuery {}
        const query = new TestQuery();
        // Act
        const exception = QueryFailedException.InvalidOperation(query, [error]);
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestQuery" failed! ' +
            'Invalid Query: Validation of "name" failed!' +
            '\nValidation of "name.length" failed!' +
            '\n\t"isNotEmpty": length should not be empty.',
        );
      });
    });

    describe('InternalHandlerError()', () => {
      it('should join messages from AggregateError', () => {
        // Arrange
        const error = new AggregateError([
          new Error('Error 1'),
          new Error('Error 2'),
        ]);
        class TestQuery {}
        const query = new TestQuery();
        // Act
        const exception = QueryFailedException.InternalHandlerError(
          query,
          error,
        );
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestQuery" failed! Internal handler error: ' +
            'Error 1\nError 2',
        );
      });

      it('should join messages from an errors property on an error object', () => {
        // Arrange
        class CustomError extends Error {
          public errors: Error[];
          constructor(errors: Error[]) {
            super('Custom error');
            this.errors = errors;
          }
        }
        const error = new CustomError([
          new Error('Error 1'),
          new Error('Error 2'),
        ]);
        class TestQuery {}
        const query = new TestQuery();
        // Act
        const exception = QueryFailedException.InternalHandlerError(
          query,
          error,
        );
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestQuery" failed! Internal handler error: ' +
            'Error 1\nError 2',
        );
      });

      it('should read the message from an error object', () => {
        // Arrange
        const error = new Error('Custom error');
        class TestQuery {}
        const query = new TestQuery();
        // Act
        const exception = QueryFailedException.InternalHandlerError(
          query,
          error,
        );
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestQuery" failed! Internal handler error: Custom error',
        );
      });
    });

    describe('HandlerNotFound()', () => {
      it('should build a message for a query without a handler', () => {
        // Arrange
        class TestQuery {}
        const query = new TestQuery();
        // Act
        const exception = QueryFailedException.HandlerNotFound(
          query,
          new Error(),
        );
        // Assert
        expect(exception.message).toBe(
          'Cqrs operation "TestQuery" failed! Handler for Query "TestQuery" not found!',
        );
      });
    });
  });
});
