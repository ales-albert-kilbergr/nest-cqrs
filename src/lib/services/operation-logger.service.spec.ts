import { mock } from 'jest-mock-extended';
import { Logger } from '@nestjs/common';
import { CommandLogger, QueryLogger } from './operation-logger.service';
import { CommandFailedException, QueryFailedException } from '../exceptions';

describe('(Unit) Operation Logger', () => {
  describe('(Unit) CommandLogger', () => {
    describe('#constructor()', () => {
      it('should create a Logger instance by default', () => {
        // Act
        const queryLogger = new CommandLogger();
        // Assert
        expect(queryLogger.logger).toBeInstanceOf(Logger);
      });
    });

    describe('#logSuccess()', () => {
      it('should log with composed message', () => {
        // Arrange
        const commandType = 'testCommand';
        const duration = 100;
        const logger = mock<Logger>();
        const commandLogger = new CommandLogger(logger);
        // Act
        commandLogger.logSuccess(commandType, duration);
        // Assert
        expect(logger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            message: `Command "${commandType}" succeeded in ${duration}ms`,
          }),
        );
      });
      it('should log a payload with the command and duration', () => {
        // Arrange
        const commandType = 'testCommand';
        const duration = 100;
        const logger = mock<Logger>();
        const commandLogger = new CommandLogger(logger);
        // Act
        commandLogger.logSuccess(commandType, duration);
        // Assert
        expect(logger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            cqrs: {
              kind: 'command',
              name: commandType,
              type: 'success',
              duration,
            },
          }),
        );
      });
    });

    describe('#logFailure()', () => {
      it('should log with composed message', () => {
        // Arrange
        const testCode = 'testCode';
        const duration = 100;
        const errorMessage = 'testMessage';
        const logger = mock<Logger>();
        const commandLogger = new CommandLogger(logger);
        class TestCommand {}
        const exception = new CommandFailedException(
          testCode,
          new TestCommand(),
          errorMessage,
        );
        // Act
        commandLogger.logFailure(exception, duration);
        // Assert
        expect(logger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            message:
              `Command "TestCommand" failed after ` +
              `100ms with code "testCode" and a reason ` +
              `"Cqrs operation "TestCommand" failed! testMessage"`,
          }),
        );
      });

      it('should log a payload with the command, duration and error', () => {
        // Arrange
        const testCode = 'testCode';
        const duration = 100;
        const errorMessage = 'testMessage';
        const logger = mock<Logger>();
        class TestCommand {}
        const commandLogger = new CommandLogger(logger);
        const exception = new CommandFailedException(
          testCode,
          new TestCommand(),
          errorMessage,
        );
        // Act
        commandLogger.logFailure(exception, duration);
        // Assert
        expect(logger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            cqrs: {
              kind: 'command',
              name: 'TestCommand',
              type: 'error',
              duration,
              errorCode: testCode,
              errorMessage: 'Cqrs operation "TestCommand" failed! testMessage',
            },
          }),
        );
      });
    });
  });

  describe('(Unit) QueryLogger', () => {
    describe('#constructor()', () => {
      it('should create a Logger instance by default', () => {
        // Act
        const queryLogger = new QueryLogger();
        // Assert
        expect(queryLogger.logger).toBeInstanceOf(Logger);
      });
    });

    describe('#logSuccess()', () => {
      it('should log with composed message', () => {
        // Arrange
        const queryType = 'testQuery';
        const duration = 100;
        const logger = mock<Logger>();
        const queryLogger = new QueryLogger(logger);
        // Act
        queryLogger.logSuccess(queryType, duration);
        // Assert
        expect(logger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            message: `Query "${queryType}" succeeded in ${duration}ms`,
          }),
        );
      });
      it('should log a payload with the query and duration', () => {
        // Arrange
        const queryType = 'testQuery';
        const duration = 100;
        const logger = mock<Logger>();
        const queryLogger = new QueryLogger(logger);
        // Act
        queryLogger.logSuccess(queryType, duration);
        // Assert
        expect(logger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            cqrs: {
              kind: 'query',
              name: queryType,
              type: 'success',
              duration,
            },
          }),
        );
      });
    });

    describe('#logFailure()', () => {
      it('should log with composed message', () => {
        // Arrange
        const testCode = 'testCode';
        const duration = 100;
        const errorMessage = 'testMessage';
        const logger = mock<Logger>();
        const queryLogger = new QueryLogger(logger);
        class TestQuery {}
        const exception = new CommandFailedException(
          testCode,
          new TestQuery(),
          errorMessage,
        );
        // Act
        queryLogger.logFailure(exception, duration);
        // Assert
        expect(logger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            message:
              `Query "TestQuery" failed after ` +
              `100ms with code "testCode" and a reason ` +
              `"Cqrs operation "TestQuery" failed! testMessage"`,
          }),
        );
      });

      it('should log a payload with the query, duration and error', () => {
        // Arrange
        const testCode = 'testCode';
        const duration = 100;
        const errorMessage = 'testMessage';
        const logger = mock<Logger>();
        class TestQuery {}
        const queryLogger = new QueryLogger(logger);
        const exception = new QueryFailedException(
          testCode,
          new TestQuery(),
          errorMessage,
        );
        // Act
        queryLogger.logFailure(exception, duration);
        // Assert
        expect(logger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            cqrs: {
              kind: 'query',
              name: 'TestQuery',
              type: 'error',
              duration,
              errorCode: testCode,
              errorMessage: 'Cqrs operation "TestQuery" failed! testMessage',
            },
          }),
        );
      });
    });
  });
});
