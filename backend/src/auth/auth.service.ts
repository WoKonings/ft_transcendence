import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import * as bcrypt from 'bcryptjs';

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
    if (!user || !(await bcrypt.compare(pass, user.password))) {
      throw new UnauthorizedException();
    }
    return this.generateToken(user);
  }

  async register(createUserDto: CreateUserDto): Promise<{ access_token: string; user: any | null }> {
    const existingUser = await this.userService.getUserForAuth(createUserDto.username);
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    try {
      // const hashedPassword = createUserDto.password;
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const newUser = await this.userService.createUser({
        ...createUserDto,
        password: hashedPassword,
      });
      return this.generateToken(newUser);

    } catch {
      console.log('bcrypt in registry probably broken again');
      return null;
    }
  }

  private async generateToken(user: any): Promise<{ access_token: string; user: any | null }> {
    const payload = { sub: user.id, username: user.username, id: user.id };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    };
  }
}