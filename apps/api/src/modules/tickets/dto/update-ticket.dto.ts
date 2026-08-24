import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import {
  TicketPriority,
  TicketStatus,
} from '../../../../generated/prisma/client';

export class UpdateTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  // Explicit null clears the assignee (unassign); undefined leaves it untouched.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  assigneeId?: string | null;
}
