// payload-size.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class PayloadSizeGuard implements CanActivate {
	private readonly maxPayloadSize = 500;

	canActivate(context: ExecutionContext): boolean {
		const client = context.switchToWs().getClient();
		const payload = context.switchToWs().getData();

		if (!payload) {
			throw new WsException('Invalid payload');
		}

		// Convert the payload to a JSON string and check the length
		const payloadSize = JSON.stringify(payload).length;
		if (payloadSize > this.maxPayloadSize) {
      console.log('Big payload rejected');
			client.emit('error', 'Payload size exceeds the 500-character limit');
			throw new WsException('Payload size exceeds the 500-character limit');
		}
		return true;
	}
}