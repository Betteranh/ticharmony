import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import type { JwtPayload } from './jwt.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({
    summary:
      'Créer un compte particulier (self-service, tenant personnel auto-créé)',
  })
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @ApiOperation({
    summary: 'Se connecter et recevoir un access token / refresh token',
  })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({
    summary: 'Échanger un refresh token contre une nouvelle paire de tokens',
  })
  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Profil de l'utilisateur authentifié" })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: JwtPayload }) {
    return this.usersService.findOne(req.user.sub);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Mettre à jour son propre profil (nom affiché, avatar)',
  })
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Req() req: { user: JwtPayload }, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(req.user.sub, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Changer son propre mot de passe' })
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Req() req: { user: JwtPayload },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.sub, dto);
  }
}
