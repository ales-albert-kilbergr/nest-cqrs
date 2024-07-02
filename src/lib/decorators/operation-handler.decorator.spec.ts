import { CommandHandler, QueryHandler } from './operation-handler.decorator';

describe('(Unit) Operation decorator', () => {
  describe('(Unit) QueryHandler decorator', () => {
    it('should define a metadata on a query handler', () => {
      // Arrange
      class Query {}

      // Act
      @QueryHandler(Query)
      class TestQueryHandler {}

      const hasMetadata = QueryHandler.metadata.has(TestQueryHandler);

      // Assert
      expect(hasMetadata).toBeTruthy();
    });

    it('should set a query constructor on a query handler', () => {
      // Arrange
      class Query {}

      // Act
      @QueryHandler(Query)
      class TestQueryHandler {}

      const metadata = QueryHandler.metadata.get(TestQueryHandler);

      // Assert
      expect(metadata?.operationCtor).toBe(Query);
    });
  });

  describe('(Unit) CommandHandler decorator', () => {
    it('should define a metadata on a command handler', () => {
      // Arrange
      class Command {}

      // Act
      @CommandHandler(Command)
      class TestCommandHandler {}

      const hasMetadata = CommandHandler.metadata.has(TestCommandHandler);

      // Assert
      expect(hasMetadata).toBeTruthy();
    });

    it('should set a command constructor on a command handler', () => {
      // Arrange
      class Command {}

      // Act
      @CommandHandler(Command)
      class TestCommandHandler {}

      const metadata = CommandHandler.metadata.get(TestCommandHandler);

      // Assert
      expect(metadata?.operationCtor).toBe(Command);
    });
  });
});
