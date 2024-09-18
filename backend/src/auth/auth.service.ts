import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { CompleteProfileDto } from './dto/completeProfile.dto';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcryptjs';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private prisma: PrismaService,
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

// 42 OAuth login method
async handle42Login(code: string): Promise<{ access_token: string; user: any | null; needsUsername?: boolean }> {
  const clientID = process.env.FORTY_TWO_CLIENT_ID;
  const clientSecret = process.env.FORTY_TWO_CLIENT_SECRET;
  const redirectUri = process.env.FORTY_TWO_REDIRECT_URI;

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://api.intra.42.fr/oauth/token', {
      grant_type: 'authorization_code',
      client_id: clientID,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const intra_access_token = tokenResponse.data.access_token;

    // Fetch user profile from 42 API using access token
    const userProfileResponse = await axios.get('https://api.intra.42.fr/v2/me', {
      headers: { Authorization: `Bearer ${intra_access_token}` },
    });

    const profile = userProfileResponse.data;

    // Check if the user exists in the database
    let user = await this.userService.getUserByIntraId(profile.id);

    if (!user) {
      console.log("generating intra user");
      await this.userService.createUser({
        password: intra_access_token,
        username: profile.login,
        email: profile.email,
        intraId: profile.id,
      })
      // If user does not exist, return token with needsUsername flag
      console.log('returning intra user');
      return { access_token: intra_access_token, user: null, needsUsername: true };
    }

    // If user exists, generate and return JWT token
    return this.generateToken(user);
  } catch (error) {
    console.error('Error during 42 OAuth login', error);
    // throw new UnauthorizedException('42 login failed');
  }
}

  async completeProfile(data: CompleteProfileDto) {
    const { access_token, username } = data;

    console.log ('huhe: ', username)
    const user = await this.userService.getUserByUsernameOrEmail(username);
    if (user) {
      console.log ('username already exists');
      return ('username already exists');
    }
    console.log ("juicer: ", user);
    await this.prisma.user.updateMany({
        where: {
          password: access_token
        },
        data: {
          username: username
        }
    })
    const updatedUser = await this.userService.getUserByUsernameOrEmail(username);
    return this.generateToken(updatedUser);
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

	async getUserProfile(req: Request) {
		const userPayload = req['user'];

		const user = await this.userService.getUserById(userPayload.sub);

		if (!user) {
      console.log('cannot find user to get profile')
      return;
		}

		return { 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      }
		};
	}
}