import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { UserPayload } from '../interfaces/user-payload.interface';

type AuthenticatedRequest = Request & { user?: UserPayload };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPayload => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user as UserPayload;
  },
);
