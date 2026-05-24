---
name: nestjs
version: "2.1.0"
description: |
  NestJS TypeScript backend development with enterprise patterns, dependency injection,
  modular architecture, and comprehensive testing support.

  Use when: (1) Project has @nestjs/core in package.json or nest-cli.json exists,
  (2) Creating modules, controllers, services, guards, pipes, interceptors, or filters,
  (3) Implementing JWT authentication or role-based authorization (RBAC/ABAC),
  (4) Integrating TypeORM, Prisma, or MikroORM for database operations,
  (5) Writing unit tests with Jest or E2E tests with supertest,
  (6) Setting up Swagger/OpenAPI documentation,
  (7) Implementing CQRS, event sourcing, or microservices patterns.

  Auto-detects: nest-cli.json, *.module.ts, *.controller.ts, *.service.ts, *.guard.ts,
  @nestjs/* packages in package.json, src/modules/ directory structure.

  NOT for: Pure Express.js without NestJS, frontend React/Vue/Angular code,
  non-TypeScript Node.js projects, Fastify without NestJS wrapper.

related:
  - typescript
  - api-design
  - testing
category: backend
---

# NestJS Development Skill

## Quick Reference

```bash
# Scaffold a new module with CRUD
python scripts/scaffold.py user --crud

# Generate specific component
python scripts/generate.py controller user
python scripts/generate.py service user --repository

# Run tests with coverage
python scripts/test.py --coverage --threshold 80
```

## Load Additional Resources

| Scenario | Reference | Description |
|----------|-----------|-------------|
| Architecture decisions | `references/architecture.md` | Clean arch, DDD, CQRS |
| Auth/Authorization | `references/security.md` | JWT, Passport, RBAC |
| Database integration | `references/database.md` | TypeORM, Prisma |
| Testing strategies | `references/testing.md` | Unit, E2E, mocking |
| Performance | `references/performance.md` | Caching, queues |

## Core Patterns

### Module Structure
```typescript
// REQ-XXX: Feature module
@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
```

### Service Pattern
```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const user = await this.userRepository.create(dto);
    this.eventEmitter.emit('user.created', user);
    return user;
  }
}
```

### Controller Pattern
```typescript
@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(dto);
  }
}
```

### DTO with Validation
```typescript
export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/)
  password: string;
}
```

### Guard Pattern
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY, [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

## Project Structure

```
src/
├── main.ts                    # Bootstrap
├── app.module.ts              # Root module
├── common/                    # Shared utilities
│   ├── decorators/           # @Roles, @User, @Public
│   ├── dto/                  # PaginationDto, ResponseDto
│   ├── filters/              # HttpExceptionFilter
│   ├── guards/               # JwtAuthGuard, RolesGuard
│   ├── interceptors/         # TransformInterceptor
│   └── pipes/                # ValidationPipe extensions
├── config/                    # Configuration
└── modules/                   # Feature modules
    └── {feature}/
        ├── {feature}.module.ts
        ├── {feature}.controller.ts
        ├── {feature}.service.ts
        ├── {feature}.repository.ts
        ├── dto/
        ├── entities/
        └── __tests__/
```

## F5 Quality Gates

| Gate | Requirement | Implementation |
|------|-------------|----------------|
| D3 | Architecture | Module structure documented |
| D4 | Detailed Design | DTOs, entities defined |
| G2.5 | Code Review | NestJS best practices |
| G3 | 80% Coverage | Jest + supertest |

## Scripts

| Script | Usage | Gate |
|--------|-------|------|
| `scaffold.py` | `scaffold.py <name> --crud` | D4 |
| `generate.py` | `generate.py <type> <name>` | G2.5 |
| `test.py` | `test.py --coverage` | G3 |

## Common Packages

```json
{
  "@nestjs/core": "^10.0.0",
  "@nestjs/common": "^10.0.0",
  "@nestjs/config": "^3.0.0",
  "@nestjs/typeorm": "^10.0.0",
  "@nestjs/passport": "^10.0.0",
  "@nestjs/jwt": "^10.0.0",
  "@nestjs/swagger": "^7.0.0",
  "class-validator": "^0.14.0"
}
```
