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
export class AuthGuard implements CanActivate {
	constructor(private jwtService: JwtService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Check if the request is HTTP or WebSocket
		if (context.getType() === 'http') {
			// For HTTP requests
			const request = context.switchToHttp().getRequest<Request>();
			const token = this.extractTokenFromHeader(request);
			if (!token) {
				throw new UnauthorizedException();
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
			// For WebSocket connections
			const client = context.switchToWs().getClient();
			const token = this.extractTokenFromSocket(client);
			if (!token) {
				throw new WsException('Unauthorized');
			}
			try {
				const payload = await this.jwtService.verifyAsync(token, {
					secret: jwtConstants.secret,
				});
				client['user'] = payload; // Attach the user to the WebSocket client object
			} catch {
				throw new WsException('Unauthorized');
			}
			return true;
		}
	}

	// Extract JWT token from HTTP request headers
	private extractTokenFromHeader(request: Request): string | undefined {
		const [type, token] = request.headers.authorization?.split(' ') ?? [];
		return type === 'Bearer' ? token : undefined;
	}

	// Extract JWT token from WebSocket handshake auth
	private extractTokenFromSocket(client: any): string | undefined {
		return client.handshake?.auth?.token;
	}
}