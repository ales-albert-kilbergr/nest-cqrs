import { QueryFailedException } from '../exceptions';
import { Query } from './operation.decorator';
import { CommandFailedException } from '../exceptions';
import { Command } from './operation.decorator';

describe('(Unit) Operation decorator', () => {
  describe('(Unit) Query decorator', () => {
    it('should define a metadata on a query', () => {
      // Arrange & Act
      @Query()
      class TestQuery {}
      const hasMetadata = Query.metadata.has(TestQuery);
      // Assert
      expect(hasMetadata).toBeTruthy();
    });

    it('should derive a query type from a query name', () => {
      // Arrange & Act
      @Query()
      class TestQuery {}
      const metadata = Query.metadata.get(TestQuery);
      // Assert
      expect(metadata?.type).toBe('TestQuery');
    });

    it('should set a default query exception', () => {
      // Arrange & Act
      @Query()
      class TestQuery {}
      const metadata = Query.metadata.get(TestQuery);
      // Assert
      expect(metadata?.exceptionFactory).toBe(QueryFailedException);
    });

    it('should set a custom query exception', () => {
      // Arrange & Act
      class CustomException extends QueryFailedException {}

      @Query({ throws: CustomException })
      class TestQuery {}
      const metadata = Query.metadata.get(TestQuery);
      // Assert
      expect(metadata?.exceptionFactory).toBe(CustomException);
    });

    it('should set a query description', () => {
      // Arrange & Act
      @Query({ description: 'Test query description' })
      class TestQuery {}
      const metadata = Query.metadata.get(TestQuery);
      // Assert
      expect(metadata?.description).toBe('Test query description');
    });
  });

  describe('(Unit) Command decorator', () => {
    it('should define a metadata on a command', () => {
      // Arrange & Act
      @Command()
      class TestCommand {}
      const hasMetadata = Command.metadata.has(TestCommand);
      // Assert
      expect(hasMetadata).toBeTruthy();
    });

    it('should derive a command type from a command name', () => {
      // Arrange & Act
      @Command()
      class TestCommand {}
      const metadata = Command.metadata.get(TestCommand);
      // Assert
      expect(metadata?.type).toBe('TestCommand');
    });

    it('should set a default command exception', () => {
      // Arrange & Act
      @Command()
      class TestCommand {}
      const metadata = Command.metadata.get(TestCommand);
      // Assert
      expect(metadata?.exceptionFactory).toBe(CommandFailedException);
    });

    it('should set a custom command exception', () => {
      // Arrange & Act
      class CustomException extends CommandFailedException {}

      @Command({ throws: CustomException })
      class TestCommand {}
      const metadata = Command.metadata.get(TestCommand);
      // Assert
      expect(metadata?.exceptionFactory).toBe(CustomException);
    });

    it('should set a command description', () => {
      // Arrange & Act
      @Command({ description: 'Test command description' })
      class TestCommand {}
      const metadata = Command.metadata.get(TestCommand);
      // Assert
      expect(metadata?.description).toBe('Test command description');
    });
  });
});
