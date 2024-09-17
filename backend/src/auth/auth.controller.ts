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
  UseGuards
} from '@nestjs/common';
import axios from 'axios';
import { Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { SignInDto } from './dto/sign-in.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { CompleteProfileDto } from './dto/completeProfile.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() signInDto: SignInDto) {
    console.log(`Attempting to log in: password = ${signInDto.password} && username = ${signInDto.username}`); // debug log, remove later
    return this.authService.signIn(signInDto.username, signInDto.password);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.userService.getUserById(req.user.userId);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  }

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

    console.log("42 Skibidi");
    // Redirect the client to 42 authorization page
    res.redirect(url);
  }
  
  @Get('42/callback')
  async handle42Callback(@Query('code') code: string, @Res() res: Response) {
    console.log(`INTRA CALLBACK!`);
  
    try {
      const loginResult = await this.authService.handle42Login(code);
      
      // Handle both cases (new user or existing user)
      if (loginResult.needsUsername) {
        res.redirect(`http://localhost:8080/choose-username?token=${loginResult.access_token}`);
      } else {
        // Redirect the user back to frontend with their token and user info
        res.redirect(`http://localhost:8080/?token=${loginResult.access_token}`);
      }
    } catch (error) {
      console.error('Error during 42 callback:', error);
      res.redirect('http://localhost:8080');
    }
  }

  // async completeProfile(@Body() completeProfileDto: { token: string; username: string }) {
  @Post('complete-profile')
  async completeProfile(@Body() data: CompleteProfileDto) {
    console.log ("finishing profile!");
    return await this.authService.completeProfile(data);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getUserProfile(@Req() req: Request) {
    return await this.authService.getUserProfile(req);
  }
}