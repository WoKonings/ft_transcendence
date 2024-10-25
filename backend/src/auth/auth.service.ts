import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import axios from 'axios';
import { error } from 'console';


@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async signIn(username: string, pass: string, twoFactorAuthenticated: boolean): Promise<{ access_token: string }> {
    const user = await this.userService.getUserForAuth(username);
    if ((!user || !(await bcrypt.compare(pass, user.password)) && twoFactorAuthenticated == false)) {
      throw new UnauthorizedException();
    }
    // if (user.twoFactorEnabled == true && twoFactorAuthenticated == false) {
    //   console.log ('2FA is ON FOR USER ', username);
    // }
    return this.generateToken(user, twoFactorAuthenticated);
  }

  // async verifyUser(username: string, pass: string) {
  //   const user = await this.userService.getUserForAuth(username);
  //   if (!user || !(await bcrypt.compare(pass, user.password))) {
  //     console.log ('WRONG PASS: ', pass);
  //     // console.log ('WRONG PASS CRYPT: ', pass);
  //     console.log ('RIGHT PASS: ', user.password);
  //     throw new UnauthorizedException();
  //   }
  //   return (user);
  // }

  async register(createUserDto: CreateUserDto): Promise<{ access_token: string }> {
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
      return this.generateToken(newUser, false);

    } catch {
      console.log('bcrypt in registry probably broken again');
      return null;
    }
  }

  // 42 OAuth login method
  async handle42Login(code: string): Promise<{ access_token: string; needsUsername?: boolean }> {
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
        const possibleConflictingUser = await this.userService.getUserByUsername(profile.login);
        if (possibleConflictingUser) {
          console.log ('CAUGHT THE NAME THIEF!');
          await this.prisma.user.delete({where: { username: profile.login }});
        }

        console.log("generating intra user");
        await this.userService.createUser({
          password: intra_access_token,
          username: profile.login,
          email: profile.email,
          intraId: profile.id,
        })
        // console.log('returning intra user');
        // return { access_token: intra_access_token };
        user = await this.userService.getUserByIntraId(profile.id);
        if (!user) {
          console.log ("MAJOR ERROR WHEN CREATING USER!!");
          return;
        }
      }

      // if user exists, generate and return JWT token
      return this.generateToken(user, false);
    } catch (error) {
      console.error('Error during 42 OAuth login', error);
      // throw new UnauthorizedException('42 login failed');
    }
  }

  private async generateToken(user: any, twoFactorAuthenticated: boolean): Promise<{ access_token: string }> {
    let payload = { sub: user.id, username: user.username, id: user.id, pre_auth: false };
    if (user.twoFactorEnabled == true && twoFactorAuthenticated == false) {
      payload.pre_auth = true;
    }
    return {
      access_token: await this.jwtService.signAsync(payload),
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
        avatar: user.avatar,
        twoFactorEnabled: user.twoFactorEnabled,
      }
		};
	}

  // 2FA implementation //
  async generateSecret(userId: number) {
    const user = await this.userService.getUserById(userId);

    const appName = 'ft_transcendence';
    const encodedUsername = encodeURIComponent(user.username);

    const secret = speakeasy.generateSecret({
      name: `${appName}:${encodedUsername}`,
      issuer: appName,
      length: 32,
    });
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    const otpauthUrl = `otpauth://totp/${appName}:${encodedUsername}?secret=${secret.base32}&issuer=${appName}&algorithm=SHA1&digits=6&period=30`;
    console.log(otpauthUrl);
    return {
      otpauthUrl,
      base32: secret.base32,
    };
  }

  async generateQrCode(otpauthUrl: string) {
    return qrcode.toDataURL(otpauthUrl);
  }

  async verifyToken(userId: number, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    return speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
    });
  }

  async enableTwoFactor(userId: number) {
    console.log ('enabling 2fa');
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
  }

  async disableTwoFactor(userId: number) {
    console.log ('disabling 2fa');
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
  }
}