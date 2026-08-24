import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketsService } from './tickets.service';

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

@ApiTags('Tickets')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Body() dto: CreateTicketDto) {
    return this.ticketsService.create(dto);
  }

  @Get()
  findAll() {
    return this.ticketsService.findAll();
  }

  // `tenantId` is only ever meaningful for internal staff acting on a ticket
  // from the aggregated multi-client queue — absent for every other caller,
  // who keeps operating on their own tenant exactly as before (enforced in
  // TicketsService, not just by omitting the param here).
  @Get(':id')
  findOne(@Param('id') id: string, @Query('tenantId') tenantId?: string) {
    return this.ticketsService.findOne(id, tenantId);
  }

  // Status/priority/assignee changes are a staff action — a CUSTOMER can see
  // and comment on their own ticket (enforced in the service) but never edit
  // its workflow fields, matching what the UI already exposes to them.
  @Patch(':id')
  @Roles('AGENT', 'ADMIN', 'SUPER_ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.ticketsService.update(id, dto, tenantId);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.ticketsService.addComment(id, dto, tenantId);
  }

  @Post(':id/comments/:commentId/attachments')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ATTACHMENT_SIZE } }),
  )
  uploadAttachment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Query('tenantId') tenantId?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Fichier manquant');
    }
    return this.ticketsService.addAttachment(id, commentId, file, tenantId);
  }

  @Get(':id/attachments/:attachmentId')
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
    @Query('tenantId') tenantId?: string,
  ) {
    const { path, filename } = await this.ticketsService.getAttachment(
      id,
      attachmentId,
      tenantId,
    );
    res.download(path, filename);
  }
}
