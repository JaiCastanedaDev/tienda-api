import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from '../interfaces/user-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UserPayload;
  },
);
