import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  Req,
  Res,
  UseGuards,
  UnauthorizedException
} from '@nestjs/common';
import { Response } from 'express';
import { TwoFAuthGuard } from './auth.2fa-guard';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { SignInDto } from './dto/sign-in.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';


//todo: remove console logs
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.username, signInDto.password, false);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.userService.getUserById(req.user.userId);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    };
  }

  //todo: make this impossible, but easy to switch back on
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Get('42')
  async redirectTo42(@Res() res: Response) {
    const clientId = process.env.FORTY_TWO_CLIENT_ID;
    const redirectUri = process.env.FORTY_TWO_REDIRECT_URI;
    const scope = 'public';
    const responseType = 'code';

    const url = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}`;

    // Redirect the client to 42 authorization page
    res.redirect(url);
  }
  
  @Get('42/callback')
  async handle42Callback(@Query('code') code: string, @Res() res: Response) {
    console.log(`INTRA CALLBACK!`);
  
    try {
      const loginResult = await this.authService.handle42Login(code);
      res.redirect(`http://localhost:8080/?token=${loginResult.access_token}`);
    } catch (error) {
      console.error('Error during 42 callback:', error);
      res.redirect('http://localhost:8080');
    }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getUserProfile(@Req() req: Request) {
    return await this.authService.getUserProfile(req);
  }


  // 2FA implementation //

  @UseGuards(AuthGuard)
  @Post('2fa/generate')
  async generateTwoFactorAuth(@Req() req) {
    console.log ( "generating 2fa qr code");
    const { otpauthUrl, base32 } = await this.authService.generateSecret(req.user.id);
    const qrCode = await this.authService.generateQrCode(otpauthUrl);
    // console.log(`qr: ${qrCode}`);
    return { qrCode, secret: base32 };
  }

  @UseGuards(AuthGuard)
  @Post('2fa/verify')
  async verifyTwoFactorAuth(@Req() req, @Body('token') token: string) {
    // trim all spaces, in case user interprets the token wrong.
    token.replace(' ', '');

    console.log('token to verify: ', token);
    const isValid = await this.authService.verifyToken(req.user.id, token);
    if (isValid) {
      console.log ('enabled 2fa');
      await this.authService.enableTwoFactor(req.user.id);
      return { message: '2FA enabled successfully' };
    }
    console.log ('failed to enable 2fa');
    throw new UnauthorizedException('invalid token');
  }

  @UseGuards(AuthGuard)
  @Post('2fa/disable')
  async disableTwoFactorAuth(@Req() req) {
    await this.authService.disableTwoFactor(req.user.id);
    console.log ('disabled 2fa');
    return { message: '2FA disabled successfully' };
  }

  @UseGuards(TwoFAuthGuard)
  @Post('2fa/authenticate')
  async authenticateWithTwoFactor(@Body() body: { username: string, password: string, token: string }) {
    const user = await this.userService.getUserForAuth(body.username);
    console.log ('authenitcating 2fa');
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    if (user.twoFactorEnabled) {
      const isValid = await this.authService.verifyToken(user.id, body.token);
      if (!isValid) {
        console.log('token issue')
        throw new UnauthorizedException('Invalid 2FA token');
      }
    }
    console.log('2fa success');
    return this.authService.signIn(user.username, body.password, true);
  }
}