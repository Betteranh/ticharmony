import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export interface CurrentUserPayload {
  sub: string;
  tenantId: string;
  roles: string[];
  email: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
