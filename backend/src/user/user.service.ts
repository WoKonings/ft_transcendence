import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException, UseGuards } from '@nestjs/common';
import { UserGateway } from './user.gateway';
import { PrismaService } from '../prisma.service';
import { Prisma, User, Channel } from '@prisma/client';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService, 
    @Inject(forwardRef(() => UserGateway)) private readonly userGateway: UserGateway,
    @Inject(forwardRef(() => AuthService)) private readonly authService: AuthService,
  ) {}

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    try {
      const newUser = await this.prisma.user.create({
        data,
      });
      return (newUser);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Unique constraint violation, a user with this email or username already exists');
        }
      }
      throw error;
    }
  }

  async addUserAsFriend(targetId: number, userId: number) {
	  console.log('targetId:', targetId, 'userId:', userId); // Log IDs to verify they are correct
	// Fetch the target user
    if (!targetId || !userId || targetId == userId) {
      throw new Error('Invalid user IDs provided');
    }
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!targetUser) {
      throw new BadRequestException('Target user not found');
    }
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId}
    })

    if (user.friends.includes(targetId) || targetUser.friends.includes(userId)) {
      console.log ("users are already friends");
      throw new BadRequestException('Already friends with user');
    }
  
    // Check if target user already added user, if so, accept on both sides.
    if (user && user.pending.includes(targetId)) {
      console.log('accepting:', targetUser.username, 'for :', user.username); // Log IDs to verify they are correct

      //update user
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          pending: {
            set: user.pending.filter(id => id !== targetId)
          },
          friends: {
            push: targetId
          }
        }
      })
      await this.prisma.user.update({
        where: { id: targetId },
        data: {
          pending: {
            set: targetUser.pending.filter(id => id !== userId)
            // remove userId
          },
          friends: {
            push: userId
          }
        }
      })

      const minimalUser = {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        isOnline: user.isOnline,
        isInGame: user.isInGame,
        isInQueue: user.isInQueue,
      };
  
      const minimalTargetUser = {
        id: targetUser.id,
        username: targetUser.username,
        avatar: targetUser.avatar,
        isOnline: targetUser.isOnline,
        isInGame: targetUser.isInGame,
        isInQueue: targetUser.isInQueue,
      };

      this.userGateway.emitToSocketByUserId(userId, 'newFriend', minimalTargetUser);
      this.userGateway.emitToSocketByUserId(targetId, 'newFriend', minimalUser);
      return { message: `You are now friends with ${targetUser.username} ` };
    }

    // Check if userId is already in the pending list
    if (targetUser.pending.includes(userId)) {
      return { message: 'Friend request already sent'};
    }

    // Update the target user's pending list
    await this.prisma.user.update({
      where: { id: targetId },
      data: {
        pending: {
          push: userId,
        },
      },
    });
    const minimalUser = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      isOnline: user.isOnline,
      isInGame: user.isInGame,
      isInQueue: user.isInQueue,
    };
    this.userGateway.emitToSocketByUserId(targetId, 'newFriendRequest', minimalUser);
    return { message: 'Friend request sent' };
  }

  async blockUser(targetId: number, userId: number) {
	  console.log('targetId:', targetId, 'userId:', userId);
    if (!targetId || !userId || targetId == userId) {
      throw new Error('Invalid user IDs provided');
    }

    const targetUser = await this.getUserById(targetId);

    if (!targetUser) {
      throw new BadRequestException('Target user not found');
    }

    const user = await this.getUserById(userId);

    if (user.blocked.includes(targetId)) {
      console.log ("user is already blocked");
      throw new BadRequestException(`Already blocked ${targetUser.username}`);
    }

    // Update the user's blocklist
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        blocked: {
          push: targetId,
        },
      },
    });

    this.userGateway.emitToSocketByUserId(userId, 'block', { id: targetUser.id, username: targetUser.username });
    return { message: `blocked ${targetUser.username}` };
  }

  async unblockUser(targetId: number, userId: number) {
	  console.log('targetId:', targetId, 'userId:', userId);
    if (!targetId || !userId || targetId == userId) {
      throw new Error('Invalid user IDs provided');
    }

    const targetUser = await this.getUserById(targetId);

    if (!targetUser) {
      throw new BadRequestException('Target user not found');
    }

    const user = await this.getUserById(userId);

    if (!user.blocked.includes(targetId)) {
      console.log ("user is already unblocked");
      throw new BadRequestException(`${targetUser.username} is not blocked`);
    }

    // Update the target user's blocklist
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        blocked: {
          set: user.blocked.filter(id => id !== targetId),
        },
      },
    });
    this.userGateway.emitToSocketByUserId(userId, 'unblock', { id: targetUser.id, username: targetUser.username });
    return { message: `unblocked ${targetUser.username}` };
  }


  async removeFriend(targetId: number, userId: number) {
    const target = await this.getUserById(targetId);
    const user = await this.getUserById(userId);
    if (!target || !user) {
      console.log("couldnt fetch users to delete");
      return;
    }
    if (!user.friends.includes(targetId)) {
      console.log("user is not friends with target to remove");
      return { message: `You are not friends with ${target.username}` };
    }
    if (!target.friends.includes(userId)) {
      console.log("target is not friends with user to remove");
      return { message: `THIS GOT TRIGGERED, MEANING VERY BAD FRIEND HANDLING!!` };
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
         friends: {
          set: user.friends.filter(friendId => friendId !== targetId)
        }
       }
    })
    await this.prisma.user.update({
      where: { id: targetId },
      data: {
        friends: {
          set: target.friends.filter(friendId => friendId !== userId)
        }
      }
    });

    const minimalUser = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      isOnline: user.isOnline,
      isInGame: user.isInGame,
      isInQueue: user.isInQueue,
    };

    const minimalTargetUser = {
      id: target.id,
      username: target.username,
      avatar: target.avatar,
      isOnline: target.isOnline,
      isInGame: target.isInGame,
      isInQueue: target.isInQueue,
    };

    this.userGateway.emitToSocketByUserId(targetId, 'removedFriend', minimalUser);
    this.userGateway.emitToSocketByUserId(userId, 'removedFriend', minimalTargetUser);
    return { message: `Removed ${target.username} succesfully` };
	}

  async getUserForAuth(usernameOrEmail: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { username: usernameOrEmail }
    });
  }

  async getUserByUsername(username: string): Promise<User | null> {
    if (username == null)
      return null;
    const user = await this.prisma.user.findFirst({
      where: { username: username }
    });
    if (!user) {
      console.log ('not found by Username')
      return null;
    }
    // console.log(`found ${user.username}, sock: ${user.socket}`);
    return user;
  }

  async getUserByIntraId(intraId: number): Promise<User | null> {
    if (intraId == null)
      return null;
    const user = await this.prisma.user.findFirst({
      where: { intraId: intraId },
    });
    return user;
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        isInGame: true,
        isInQueue: true,
        isOnline: true,
        avatar: true,
      },
	});
  
	return users;
  }

  async getFriends(userId: number) {
    // Fetch the user with their friends' IDs
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { friends: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }
    // Retrieve each friend's information
    const friendsList = await Promise.all(
      user.friends.map(async (friendId) => {
        const friend = await this.prisma.user.findUnique({
          where: { id: friendId },
          select: {
            id: true,
            username: true,
            isOnline: true,
            isInGame: true,
            isInQueue: true,
            avatar: true,
          },
        });
        return friend;
      }),
    );

    return friendsList;
  }

  async getIncomingPendingFriends(userId: number) {
    // Fetch the user with their friends' IDs
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pending: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Retrieve each friend's information
    const pendingList = await Promise.all(
      user.pending.map(async (pendingId) => {
        const pending = await this.prisma.user.findUnique({
          where: { id: pendingId },
          select: {
            id: true,
            username: true,
            isOnline: true,
            isInGame: true,
            isInQueue: true,
            // avatar: true,
          },
        });
        return pending;
      }),
    );
    return pendingList;
  }

  async getBlocked(userId: number) {
    // Fetch the user with their blocked' IDs
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { blocked: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }
    // Retrieve each blocked users's relevant information
    const blockList = await Promise.all(
      user.blocked.map(async (friendId) => {
        const friend = await this.prisma.user.findUnique({
          where: { id: friendId },
          select: {
            id: true,
            username: true,
          },
        });
        return friend;
      }),
    );

    return blockList;
  }

  async getUserById(userId: number) {
    if (!userId) {
      console.log('caught null userId');
      return (null);
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { channels: true},
    });
    if (!user) {
      console.log(`could not find user by id: ${userId}`);
      return (null);
    }
    return (user);
  }

  async getIsInGame(userId: number): Promise<Boolean> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user.isInGame;
  }
  
  async setIsInGame(userId: number, bool: boolean): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isInGame: bool, isInQueue: false },
    });
  
    // console.log(`${user.username} is ingame?: ${user.isInGame}`);
  }

  async setIsInQueue(userId: number, bool: boolean): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isInQueue: bool },
    });
  
    // console.log(`${user.username} is inqueue?: ${user.isInQueue}`);
  }


  // async deleteUser(id: number): Promise<User> {
  //   const user = await this.getUserById(id);
  
  //   if (!user) {
  //     throw new NotFoundException(`User with ID ${id} not found.`);
  //   }
  
  //   // Find all users who have this user in their friends list
  //   const friends = await this.prisma.user.findMany({
  //     where: {
  //       friends: {
  //         has: id,
  //       },
  //     },
  //   });
  
  //   // Update each friend's friends list to remove the deleted user's ID
  //   for (const friend of friends) {
  //     await this.prisma.user.update({
  //       where: { id: friend.id },
  //       data: {
  //         friends: {
  //           set: friend.friends.filter((friendId) => friendId !== id), // Remove the deleted user's ID
  //         },
  //       },
  //     });
  //   }
  //   // disconnect user from all channels they were in.
  //   for (const channels in user.channels) {
  //     console.log(`channel: ${channels}`);
  //     await this.prisma.channel.update({
  //       where: {name: channels},
  //       data: {
  //         users: {
  //           disconnect: { username: user.username }
  //         }
  //       }
        
  //     });
  //   }
 
  //   return this.prisma.user.delete({
  //     where: { id },
  //   });
  // }

  async updateAvatar(userId: number, filename: string): Promise<void> {
    const avatarPath = `/uploads/avatars/${filename}`;
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarPath },
    });
    this.userGateway.emitToSocketByUserId(userId, 'userStatusUpdate', { userId, avatar: avatarPath });
    this.userGateway.emitUserStatusUpdate(userId, { avatar: avatarPath });
    console.log ('avatar should update');
  }

  async updateUsername(userId: number, newUsername: string) {
    // ensure name is not taken already
    let user = await this.prisma.user.findUnique({
      where: { username: newUsername }
    });
    if (user) {
      throw new BadRequestException('Username already taken');
    }

    // update!
    await this.prisma.user.update({
      where: { id: userId },
      data: { username: newUsername }, 
    });

    // notify users.
    this.userGateway.emitUserStatusUpdate(userId, { username: newUsername });

    console.log('updated username!');
    user = await this.prisma.user.findUnique({
      where: { username: newUsername }
    });
    //generate new token?
    const newToken = this.authService.newNameNewToken(user);
    return (newToken);
  }
}
