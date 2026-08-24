import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AssetsService } from './assets.service';
import { CreateAssetNoteDto } from './dto/create-asset-note.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetNoteDto } from './dto/update-asset-note.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@ApiTags('Assets')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get(':tenantId')
  @Roles('ADMIN', 'AGENT', 'SUPER_ADMIN')
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tenantId') tenantId: string,
  ) {
    return this.assetsService.findAll(user.tenantId, tenantId);
  }

  @Post(':tenantId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetsService.create(user.tenantId, tenantId, dto);
  }

  @Patch(':tenantId/:assetId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tenantId') tenantId: string,
    @Param('assetId') assetId: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(user.tenantId, tenantId, assetId, dto);
  }

  @Post(':tenantId/:assetId/notes')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createNote(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tenantId') tenantId: string,
    @Param('assetId') assetId: string,
    @Body() dto: CreateAssetNoteDto,
  ) {
    return this.assetsService.createNote(user.tenantId, tenantId, assetId, dto);
  }

  @Patch(':tenantId/:assetId/notes/:noteId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateNote(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tenantId') tenantId: string,
    @Param('assetId') assetId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateAssetNoteDto,
  ) {
    return this.assetsService.updateNote(
      user.tenantId,
      tenantId,
      assetId,
      noteId,
      dto,
    );
  }

  @Delete(':tenantId/:assetId/notes/:noteId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteNote(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tenantId') tenantId: string,
    @Param('assetId') assetId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.assetsService.deleteNote(
      user.tenantId,
      tenantId,
      assetId,
      noteId,
    );
  }
}
