

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService
  ) {}

  async signIn(
    username: string,
    pass: string,
  ): Promise<{ access_token: string; user: any | null }> {
    const user = await this.userService.getUserForAuth(username);
    if (!user || user.password !== pass) {
      throw new UnauthorizedException();
    }
    //todo: figure out if sub is really needed
    const payload = { sub: user.id, username: user.username, id: user.id};
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { //todo: maybe not return the actual user info?
        id: user.id,
        username: user.username,
        email: user.email
      }
    };
  }
}