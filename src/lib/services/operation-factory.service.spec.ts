import {
  CommandBus,
  CommandHandlerNotFoundException,
  QueryBus,
  QueryHandlerNotFoundException,
} from '@nestjs/cqrs';
import { CommandLogger, QueryLogger } from './operation-logger.service';
import { mock } from 'jest-mock-extended';
import { CommandFactory, QueryFactory } from './operation-factory.service';
import { CommandFailedException, QueryFailedException } from '../exceptions';
import { Command, Query } from '../decorators';
import { MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

describe('(Unit) OperationFactory', () => {
  describe('(Unit) CommandFactory', () => {
    let commandBus: CommandBus;
    let logger: CommandLogger;
    let factory: CommandFactory;
    let spyOnExecute: jest.SpyInstance;
    let spyOnLogCommandExecuted: jest.SpyInstance;
    let spyOnLogCommandFailed: jest.SpyInstance;

    beforeEach(() => {
      commandBus = mock<CommandBus>();
      logger = mock<CommandLogger>();
      factory = new CommandFactory(logger, commandBus);
    });

    afterEach(() => {
      if (spyOnExecute) {
        spyOnExecute.mockRestore();
      }
      if (spyOnLogCommandExecuted) {
        spyOnLogCommandExecuted.mockRestore();
      }
      if (spyOnLogCommandFailed) {
        spyOnLogCommandFailed.mockRestore();
      }
    });

    it('should fail to build a command without @Command decorator', async () => {
      // Arrange
      class TestCommand {}
      // Act
      const act = () => factory.create(TestCommand);
      // Assert
      expect(act).toThrow(TypeError);
    });

    it('should automatically expose setter methods from the command properties', async () => {
      // Arrange
      @Command()
      class MyCommand {
        public name!: string;
        public age!: number;
      }

      const builder = factory.create(MyCommand);
      // Act
      const command = await builder.name('John').age(30).build();
      // Assert
      expect(command).toEqual({ name: 'John', age: 30 });
    });

    it('should return a command property value', () => {
      // Arrange
      @Command()
      class MyCommand {
        public name!: string;
      }

      const builder = factory.create(MyCommand);
      // Act
      const value = builder.name('John').name();
      // Assert
      expect(value).toBe('John');
    });

    it('should return a default value for a command property', () => {
      // Arrange
      @Command()
      class MyCommand {
        public name = 'John';
      }

      const builder = factory.create(MyCommand);
      // Act
      const value = builder.name();
      // Assert
      expect(value).toBe('John');
    });

    it('should run a validation on a command property', async () => {
      // Arrange
      @Command()
      class MyCommand {
        @MaxLength(5)
        public name!: string;
      }

      const builder = factory.create(MyCommand);
      // Act
      const act = builder.name('JohnJohn').build();
      // Assert
      await expect(act).rejects.toThrow(
        expect.objectContaining({
          code: CommandFailedException.errorCodes.INVALID_OPERATION,
        }),
      );
    });

    it('should wrap the validation error as aggregate error and expose it on the exception', async () => {
      // Arrange
      @Command()
      class MyCommand {
        @MaxLength(5)
        public name!: string;
      }

      const builder = factory.create(MyCommand);
      // Act
      const act = builder.name('JohnJohn').build();
      // Assert
      await expect(act).rejects.toThrow(
        expect.objectContaining({
          origError: expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                property: 'name',
                constraints: {
                  maxLength:
                    'name must be shorter than or equal to 5 characters',
                },
              }),
            ]),
          }),
        }),
      );
    });

    it('should apply custom property transformation', async () => {
      // Arrange
      @Command()
      class MyCommand {
        @Transform(({ value }) =>
          typeof value === 'string' ? value.toUpperCase() : value,
        )
        public name!: string;
      }

      const builder = factory.create(MyCommand);
      // Act
      const command = await builder.name('John').build();
      // Assert
      expect(command).toEqual({ name: 'JOHN' });
    });

    it('should clear the mutated command state', () => {
      // Arrange
      @Command()
      class MyCommand {
        public name!: string;
      }

      const builder = factory.create(MyCommand);
      // Act
      const name = builder.name('John').clear().name();
      // Assert
      expect(name).toBeUndefined();
    });

    it('should clear the mutated state to default value', () => {
      // Arrange
      @Command()
      class MyCommand {
        public name = 'John';
      }

      const builder = factory.create(MyCommand);
      // Act
      const name = builder.name('Jane').clear().name();
      // Assert
      expect(name).toBe('John');
    });

    it('should accept an object for nested property', () => {
      // Arrange
      @Command()
      class MyCommand {
        public nested!: {
          name: string;
        };
      }
      const builder = factory.create(MyCommand);
      // Act
      builder.nested({ name: 'John' });
      // Assert
      expect(builder.nested()).toEqual({ name: 'John' });
    });

    it('should support setting items into an array property', () => {
      // Arrange
      @Command()
      class MyCommand {
        public names!: string[];
      }
      const builder = factory.create(MyCommand);
      // Act
      builder.names(['John', 'Jane']);
      // Assert
      expect(builder.names()).toEqual(['John', 'Jane']);
    });

    it('should execute a command handler', async () => {
      // Arrange
      const result = 42;
      @Command()
      class MyCommand {
        public name!: string;
      }
      spyOnExecute = jest
        .spyOn(commandBus, 'execute')
        .mockResolvedValue(result);
      // Act
      const actual = await factory.create(MyCommand).name('John').execute();

      // Assert
      expect(actual).toBe(result);
    });

    it('should fail if the handler does not exits', async () => {
      // Arrange
      @Command()
      class MyCommand {}
      spyOnExecute = jest
        .spyOn(commandBus, 'execute')
        .mockRejectedValue(new CommandHandlerNotFoundException(MyCommand.name));
      // Act
      const act = () => factory.create(MyCommand).execute();
      // Assert
      await expect(act).rejects.toThrow(CommandFailedException);
      await expect(act).rejects.toThrow(
        expect.objectContaining({
          code: CommandFailedException.errorCodes.HANDLER_NOT_FOUND,
          origError: expect.any(CommandHandlerNotFoundException),
        }),
      );
    });

    it('should catch custom error in command handler into internal handler error', async () => {
      // Arrange
      @Command()
      class TestCommand {}
      const customError = new Error('Custom error');
      spyOnExecute = jest
        .spyOn(commandBus, 'execute')
        .mockRejectedValue(customError);
      // Act
      const act = () => factory.create(TestCommand).execute();
      // Assert
      await expect(act).rejects.toThrow(
        expect.objectContaining({
          code: CommandFailedException.errorCodes.INTERNAL_HANDLER_ERROR,
          origError: customError,
        }),
      );
    });

    it('should let pass a child of CommandFailedException', async () => {
      // Arrange
      @Command()
      class TestCommand {}
      const customError = new CommandFailedException(
        CommandFailedException.errorCodes.INTERNAL_HANDLER_ERROR,
        new TestCommand(),
        'Custom error',
      );
      spyOnExecute = jest
        .spyOn(commandBus, 'execute')
        .mockRejectedValue(customError);
      // Act
      const act = () => factory.create(TestCommand).execute();
      // Assert
      await expect(act).rejects.toThrow(customError);
    });

    it('should stringify non error exception from handler', async () => {
      // Arrange
      @Command()
      class MyCommand {}
      spyOnExecute = jest
        .spyOn(commandBus, 'execute')
        .mockRejectedValue('Custom error');

      // Act
      const act = () => factory.create(MyCommand).execute();
      // Assert
      await expect(act).rejects.toThrow(
        expect.objectContaining({
          code: CommandFailedException.errorCodes.INTERNAL_HANDLER_ERROR,
          origError: new Error('Custom error'),
        }),
      );
    });

    it('should log command successful execution', async () => {
      // Arrange
      const result = 42;
      @Command()
      class MyCommand {
        public name!: string;
      }
      spyOnExecute = jest
        .spyOn(commandBus, 'execute')
        .mockResolvedValue(result);
      spyOnLogCommandExecuted = jest.spyOn(logger, 'logSuccess');
      // Act
      await factory.create(MyCommand).name('John').execute();
      // Assert
      expect(spyOnLogCommandExecuted).toHaveBeenCalledWith(
        'MyCommand',
        expect.any(Number),
      );
    });

    it('should log command failed execution', async () => {
      // Arrange
      @Command()
      class MyCommand {
        public name!: string;
      }
      const customError = new Error('Custom error');
      spyOnExecute = jest
        .spyOn(commandBus, 'execute')
        .mockRejectedValue(customError);
      spyOnLogCommandFailed = jest.spyOn(logger, 'logFailure');
      // Act
      const act = () => factory.create(MyCommand).name('John').execute();
      // Assert
      await expect(act).rejects.toThrow(CommandFailedException);
      expect(spyOnLogCommandFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          code: CommandFailedException.errorCodes.INTERNAL_HANDLER_ERROR,
          origError: customError,
        }),
        expect.any(Number),
      );
    });
  });

  describe('(Unit) QueryFactory', () => {
    let queryBus: QueryBus;
    let logger: QueryLogger;
    let factory: QueryFactory;
    let spyOnExecute: jest.SpyInstance;
    let spyOnLogQueryExecuted: jest.SpyInstance;
    let spyOnLogQueryFailed: jest.SpyInstance;

    beforeEach(() => {
      queryBus = mock<QueryBus>();
      logger = mock<QueryLogger>();
      factory = new QueryFactory(logger, queryBus);
    });

    afterEach(() => {
      if (spyOnExecute) {
        spyOnExecute.mockRestore();
      }
      if (spyOnLogQueryExecuted) {
        spyOnLogQueryExecuted.mockRestore();
      }
      if (spyOnLogQueryFailed) {
        spyOnLogQueryFailed.mockRestore();
      }
    });

    it('should fail to build a query without @Query decorator', async () => {
      // Arrange
      class TestQuery {}
      // Act
      const act = () => factory.create(TestQuery);
      // Assert
      expect(act).toThrow(TypeError);
    });

    it('should automatically expose setter methods from the query properties', async () => {
      // Arrange
      @Query()
      class MyQuery {
        public name!: string;
        public age!: number;
      }

      const builder = factory.create(MyQuery);
      // Act
      const query = await builder.name('John').age(30).build();
      // Assert
      expect(query).toEqual({ name: 'John', age: 30 });
    });

    it('should return a query property value', () => {
      // Arrange
      @Query()
      class MyQuery {
        public name!: string;
      }

      const builder = factory.create(MyQuery);
      // Act
      const value = builder.name('John').name();
      // Assert
      expect(value).toBe('John');
    });

    it('should return a default value for a query property', () => {
      // Arrange
      @Query()
      class MyQuery {
        public name = 'John';
      }

      const builder = factory.create(MyQuery);
      // Act
      const value = builder.name();
      // Assert
      expect(value).toBe('John');
    });

    it('should run a validation on a query property', async () => {
      // Arrange
      @Query()
      class MyQuery {
        @MaxLength(5)
        public name!: string;
      }

      const builder = factory.create(MyQuery);
      // Act
      const act = builder.name('JohnJohn').build();
      // Assert
      await expect(act).rejects.toThrow(
        expect.objectContaining({
          code: QueryFailedException.errorCodes.INVALID_OPERATION,
        }),
      );
    });

    it('should wrap the validation error as aggregate error and expose it on the exception', async () => {
      // Arrange
      @Query()
      class MyQuery {
        @MaxLength(5)
        public name!: string;
      }

      const builder = factory.create(MyQuery);
      // Act
      const act = builder.name('JohnJohn').build();
      // Assert
      await expect(act).rejects.toThrow(
        expect.objectContaining({
          origError: expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                property: 'name',
                constraints: {
                  maxLength:
                    'name must be shorter than or equal to 5 characters',
                },
              }),
            ]),
          }),
        }),
      );
    });

    it('should apply custom property transformation', async () => {
      // Arrange
      @Query()
      class MyQuery {
        @Transform(({ value }) =>
          typeof value === 'string' ? value.toUpperCase() : value,
        )
        public name!: string;
      }

      const builder = factory.create(MyQuery);
      // Act
      const query = await builder.name('John').build();
      // Assert
      expect(query).toEqual({ name: 'JOHN' });
    });

    it('should clear the mutated query state', () => {
      // Arrange
      @Query()
      class MyQuery {
        public name!: string;
      }

      const builder = factory.create(MyQuery);
      // Act
      const name = builder.name('John').clear().name();
      // Assert
      expect(name).toBeUndefined();
    });

    it('should clear the mutated state to default value', () => {
      // Arrange
      @Query()
      class MyQuery {
        public name = 'John';
      }

      const builder = factory.create(MyQuery);
      // Act
      const name = builder.name('Jane').clear().name();
      // Assert
      expect(name).toBe('John');
    });

    it('should accept an object for nested property', () => {
      // Arrange
      @Query()
      class MyQuery {
        public nested!: {
          name: string;
        };
      }
      const builder = factory.create(MyQuery);
      // Act
      builder.nested({ name: 'John' });
      // Assert
      expect(builder.nested()).toEqual({ name: 'John' });
    });

    it('should support setting items into an array property', () => {
      // Arrange
      @Query()
      class MyQuery {
        public names!: string[];
      }
      const builder = factory.create(MyQuery);
      // Act
      builder.names(['John', 'Jane']);
      // Assert
      expect(builder.names()).toEqual(['John', 'Jane']);
    });

    it('should execute a query handler', async () => {
      // Arrange
      const result = 42;
      @Query()
      class MyQuery {
        public name!: string;
      }
      spyOnExecute = jest.spyOn(queryBus, 'execute').mockResolvedValue(result);
      // Act
      const actual = await factory.create(MyQuery).name('John').execute();

      // Assert
      expect(actual).toBe(result);
    });

    it('should fail if the handler does not exits', async () => {
      // Arrange
      @Query()
      class MyQuery {}
      spyOnExecute = jest
        .spyOn(queryBus, 'execute')
        .mockRejectedValue(new QueryHandlerNotFoundException(MyQuery.name));
      // Act
      const act = () => factory.create(MyQuery).execute();
      // Assert
      await expect(act).rejects.toThrow(QueryFailedException);
      await expect(act).rejects.toThrow(
        expect.objectContaining({
          code: QueryFailedException.errorCodes.HANDLER_NOT_FOUND,
          origError: expect.any(QueryHandlerNotFoundException),
        }),
      );
    });

    it('should catch custom error in query handler into internal handler error', async () => {
      // Arrange
      @Query()
      class TestQuery {}
      const customError = new Error('Custom error');
      spyOnExecute = jest
        .spyOn(queryBus, 'execute')
        .mockRejectedValue(customError);
      // Act
      const act = () => factory.create(TestQuery).execute();
      // Assert
      await expect(act).rejects.toThrow(
        expect.objectContaining({
          code: QueryFailedException.errorCodes.INTERNAL_HANDLER_ERROR,
          origError: customError,
        }),
      );
    });

    it('should let pass a child of QueryFailedException', async () => {
      // Arrange
      @Query()
      class TestQuery {}
      const customError = new QueryFailedException(
        QueryFailedException.errorCodes.INTERNAL_HANDLER_ERROR,
        new TestQuery(),
        'Custom error',
      );
      spyOnExecute = jest
        .spyOn(queryBus, 'execute')
        .mockRejectedValue(customError);
      // Act
      const act = () => factory.create(TestQuery).execute();
      // Assert
      await expect(act).rejects.toThrow(customError);
    });

    it('should stringify non error exception from handler', async () => {
      // Arrange
      @Query()
      class MyQuery {}
      spyOnExecute = jest
        .spyOn(queryBus, 'execute')
        .mockRejectedValue('Custom error');

      // Act
      const act = () => factory.create(MyQuery).execute();
      // Assert
      await expect(act).rejects.toThrow(
        expect.objectContaining({
          code: QueryFailedException.errorCodes.INTERNAL_HANDLER_ERROR,
          origError: new Error('Custom error'),
        }),
      );
    });

    it('should log query successful execution', async () => {
      // Arrange
      const result = 42;
      @Query()
      class MyQuery {
        public name!: string;
      }
      spyOnExecute = jest.spyOn(queryBus, 'execute').mockResolvedValue(result);
      spyOnLogQueryExecuted = jest.spyOn(logger, 'logSuccess');
      // Act
      await factory.create(MyQuery).name('John').execute();
      // Assert
      expect(spyOnLogQueryExecuted).toHaveBeenCalledWith(
        'MyQuery',
        expect.any(Number),
      );
    });

    it('should log query failed execution', async () => {
      // Arrange
      @Query()
      class MyQuery {
        public name!: string;
      }
      const customError = new Error('Custom error');
      spyOnExecute = jest
        .spyOn(queryBus, 'execute')
        .mockRejectedValue(customError);
      spyOnLogQueryFailed = jest.spyOn(logger, 'logFailure');
      // Act
      const act = () => factory.create(MyQuery).name('John').execute();
      // Assert
      await expect(act).rejects.toThrow(QueryFailedException);
      expect(spyOnLogQueryFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          code: QueryFailedException.errorCodes.INTERNAL_HANDLER_ERROR,
          origError: customError,
        }),
        expect.any(Number),
      );
    });
  });
});
