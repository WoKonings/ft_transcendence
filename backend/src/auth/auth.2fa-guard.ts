import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { Request } from 'express';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class TwoFAuthGuard implements CanActivate {
	constructor(private jwtService: JwtService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Check if the request is HTTP or WebSocket
		if (context.getType() === 'http') {
			// for HTTP requests
			const request = context.switchToHttp().getRequest<Request>();
			const token = this.extractTokenFromHeader(request);
			if (!token) {
				throw new UnauthorizedException('No JWT token in header');
			}
			try {
				const payload = await this.jwtService.verifyAsync(token, {
					secret: jwtConstants.secret,
				});
				request['user'] = payload;
			} catch {
				throw new UnauthorizedException();
			}
			return true;
		} else if (context.getType() === 'ws') {
			// for WebSocket connections
			const client = context.switchToWs().getClient();
			const token = this.extractTokenFromSocket(client);
			if (!token) {
				throw new WsException('Unauthorized');
			}
			try {
				const payload = await this.jwtService.verifyAsync(token, {
					secret: jwtConstants.secret,
				});
				client['user'] = payload; // attach the user to the WebSocket client
			} catch {
				throw new WsException('Unauthorized');
			}
			return true;
		}
	}

	// extract JWT token from HTTP request headers
	private extractTokenFromHeader(request: Request): string | undefined {
		const [type, token] = request.headers.authorization?.split(' ') ?? [];
		return type === 'Bearer' ? token : undefined;
	}

	// extract JWT token from WebSocket handshake auth
	private extractTokenFromSocket(client: any): string | undefined {
		return client.handshake?.auth?.token;
	}
}