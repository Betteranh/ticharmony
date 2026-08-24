import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketPriority } from '../../../../generated/prisma/client';

export class CreateTicketDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
