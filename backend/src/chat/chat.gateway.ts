import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway()
export class ChatGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private readonly chatService: ChatService) {}

  handleDisconnect(client: Socket) {
    this.chatService.removeUserSocket(client.id);
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() userId: number, @ConnectedSocket() client: Socket) {
    this.chatService.addUserSocket(userId, client.id);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(@MessageBody() data: { senderId: number; receiverId: number; message: string }) {
    const receiverSocketId = this.chatService.getUserSocket(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('newMessage', {
        senderId: data.senderId,
        message: data.message,
      });
    }
  }
}
