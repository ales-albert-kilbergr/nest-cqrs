# Nest CQRS Factory

The Nest CQRS Factory is a library that provides an opinionated way to declare
and build CQRS commands and queries in a NestJS application. The library
integrates with the NestJS Cqrs Module.

Commands and Queries can be declared as classes with class validators and
class transformer decorators. The Command and Query factories provide a
builder to create instances of the commands and queries alongside their validation, transformation and execution.

The library also provides a unified way to log the commands and queries' success or failure with their time of execution.

The library introduces also a convention to throw a typed exception when a command or query fails. The base exceptions are `CommandFailedException` and `QueryFailedException` respectively.

## Installation

```bash
# with npm
$ npm install @kilbergr/nest-cqrs-factory
# with yarn
$ yarn add @kilbergr/nest-cqrs-factory
```

## Import

```ts
import { CommandFactory, QueryFactory } from '@kilbergr/nest-cqrs-factory';
```

## Commands

The command declaration requires `@Command` decorator. The decorator fabricates
metadata which is attached to the command constructor function under a private symbol-based property. The command metadata contains:

- `description`: a description of a command for future inspection purposes.

- `throws`: a reference to an exception class that the command may throw.
  the exception class should extend the `CommandFailedException` class and
  if not provided, the command will throw a generic `CommandFailedException`.

**Example:**

```ts
@Command()
export class CreateUser {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;
}
```

## Command Failed Exception

The `CommandFailedException` describes the error by a cod and message. The exception
also keeps track of the command that failed and the original error that caused the failure. Both for retrieval, logging and debugging purposes.

The base `CommandFailedException` defines three basic factories:

- `HandlerNotFound`: when the command handler is not found. (Forwards the
  `CommandHandlerNotFoundException` from `@nestjs/cqrs` package).

- `InvalidOperation`: when the command is invalid. The `origError` is an
  `AggregateError` with `ValidationErrors` inside.

- `InternalHandlerError`: when the command handler throws any other error than
  the `CommandFailedException` or its child. The library presumes that if the
  programmer wants the command to fail, he will implement the `CommandFailedException`
  child class for a given command. So, if the handler throws any other error, it
  is considered an unhandled error and the `InternalHandlerError` is thrown
  with the original error inside.

**Example of custom Command Failed Exception:**

```ts
export class CreateUserException extends CommandFailedException {
  public static errorCodes = {
    ...CommandFailedException.errorCodes,
    USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  };

  public static UserAlreadyExists(command: CreateUser): CreateUserException {
    return new CreateUserException(
      CreateUserException.errorCodes.USER_ALREADY_EXISTS,
      command,
      `User "${command.name}" already exists`,
    );
  }
}
```

To instruct the `CommandFactory` that the custom `CreateUserException`
should be thrown in case of this command failure (for example in case of
wrong validation or internal handler error), the `throws` property should be
set in the `@Command` decorator:

```ts
@Command({
  throws: CreateUserException,
})
export class CreateUser {
  ...
}
```

### Building and Executing Commands

The `CommandFactory` provides a `build` method to create a self-executable
instance of a command. The `build` method validates the command and transforms
it to the DTO object. The `execute` method executes the command and logs the
success or failure of the command. (The build method can be skipped if the command
execution is called directly).

**Example:**

```ts
class UserController {
  constructor(
    private readonly commandFactory: CommandFactory,
  ): Promise<string> {}

  public async create(dto: CreateUserDto): Promise<User> {
    const result = await this.commandFactory
      .create<CreateUser, string>(CreateUser)
      .name(dto.name)
      .email(dto.email)
      .execute();

    return result;
  }
}
```

### Command logging

The `CommandFactory` logs the command execution with the `Logger` service. The
log message contains the command name, the time of execution, the success or
failure status and the error message in case of failure.

**Success Log**

```json
{
  "message": "Command 'CreateUser' succeeded in 50ms.",
  "cqrs": {
    "kind": "command",
    "name": "CreateUser",
    "status": "success",
    "duration": 50
  }
}
```

**Error log**

```json
{
  "message": "Command 'CreateUser' failed after 50ms with code 'USER_ALREADY_EXISTS and a reason: 'User John Doe already exists'.",
  "cqrs": {
    "kind": "command",
    "name": "CreateUser",
    "status": "error",
    "duration": 50,
    "errorCode": "USER_ALREADY_EXISTS",
    "errorMessage": "User 'John Doe' already exists"
  }
}
```

## Queries

The query declaration requires `@Query` decorator. The decorator fabricates
metadata which is attached to the query constructor function under a private symbol-based property. The query metadata contains:

- `description`: a description of a query for future inspection purposes.

- `throws`: a reference to an exception class that the query may throw.
  the exception class should extend the `QueryFailedException` class and
  if not provided, the query will throw a generic `QueryFailedException`.

**Example:**

```ts
@Query()
export class GetUser {
  @IsString()
  @IsNotEmpty()
  id: string;
}
```

## Query Failed Exception

The `QueryFailedException` describes the error by a cod and message. The exception
also keeps track of the query that failed and the original error that caused the failure. Both for retrieval, logging and debugging purposes.

The base `QueryFailedException` defines three basic factories:

- `HandlerNotFound`: when the query handler is not found. (Forwards the
  `QueryHandlerNotFoundException` from `@nestjs/cqrs` package).

- `InvalidOperation`: when the query is invalid. The `origError` is an
  `AggregateError` with `ValidationErrors` inside.

- `InternalHandlerError`: when the query handler throws any other error than
  the `QueryFailedException` or its child. The library presumes that if the
  programmer wants the query to fail, he will implement the `QueryFailedException`
  child class for a given query. So, if the handler throws any other error, it
  is considered an unhandled error and the `InternalHandlerError` is thrown
  with the original error inside.

**Example of custom Query Failed Exception:**

```ts
export class GetUserException extends QueryFailedException {
  public static errorCodes = {
    ...QueryFailedException.errorCodes,
    USER_NOT_FOUND: 'USER_NOT_FOUND',
  };

  public static UserNotFound(query: GetUser): GetUserException {
    return new GetUserException(
      GetUserException.errorCodes.USER_NOT_FOUND,
      query,
      `User with id "${query.id}" not found`,
    );
  }
}
```

To instruct the `QueryFactory` that the custom `GetUserException`
should be thrown in case of this query failure (for example in case of
wrong validation or internal handler error), the `throws` property should be
set in the `@Query` decorator:

```ts
@Query({
  throws: GetUserException,
})
export class GetUser {
  ...
}
```

### Building and Executing Queries

The `QueryFactory` provides a `build` method to create a self-executable
instance of a query. The `build` method validates the query and transforms
it to the DTO object. The `execute` method executes the query and logs the
success or failure of the query. (The build method can be skipped if the query
execution is called directly).

**Example:**

```ts
class UserController {
  constructor(private readonly queryFactory: QueryFactory): Promise<User> {}

  public async get(id: string): Promise<User> {
    const result = await this.queryFactory
      .create<GetUser, User>(GetUser)
      .id(id)
      .execute();

    return result;
  }
}
```

### Query logging

The `QueryFactory` logs the query execution with the `Logger` service. The
log message contains the query name, the time of execution, the success or
failure status and the error message in case of failure.

**Success Log**

```json
{
  "message": "Query 'GetUser' succeeded in 50ms.",
  "cqrs": {
    "kind": "query",
    "name": "GetUser",
    "status": "success",
    "duration": 50
  }
}
```

**Error log**

```json
{
  "message": "Query 'GetUser' failed after 50ms with code 'USER_NOT_FOUND and a reason: 'User with id '123' not found'.",
  "cqrs": {
    "kind": "query",
    "name": "GetUser",
    "status": "error",
    "duration": 50,
    "errorCode": "USER_NOT_FOUND",
    "errorMessage": "User with id '123' not found"
  }
}
```

## Development

### Running the tests

```bash
$ npm run test
```

### Building the package

```bash
$ npm run build
```

### Publishing the package

```bash
$ npm publish
```
