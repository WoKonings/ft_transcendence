import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException, UseGuards } from '@nestjs/common';
import { UserGateway } from './user.gateway';
import { PrismaService } from '../prisma.service';
import { Prisma, User, Channel } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService, 
    @Inject(forwardRef(() => UserGateway)) private readonly userGateway: UserGateway,
  ) {} // Inject the gateway) {}

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

  //todo: accept user if they added you and you add them?
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

    // Check if target user already added user, if so, accept on both sides.
    const user = await this.prisma.user.findUnique({
      where: { id: userId}
    })
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
      // notify both users of new friend
      this.userGateway.emitToSocketByUserId(userId, 'newFriend', targetUser);
      this.userGateway.emitToSocketByUserId(targetId, 'newFriend', user);
      // this.userGateway.emitToSocketByUserId(user.id, 'newFriend', user);
      return { message: `You are now friends with ${targetUser.username} ` };
    }

    // Check if userId is already in the pending list
    if (targetUser.pending.includes(userId)) {
      // throw new BadRequestException('Friend request already sent');
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
    this.userGateway.emitToSocketByUserId(targetId, 'newFriendRequest', user);
    // this.userGateway.emitToSocketByUserId(userId, 'newFriendRequest', targetUser);
    return { message: 'Friend request sent' };
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
    this.userGateway.emitToSocketByUserId(targetId, 'removedFriend', user);
    this.userGateway.emitToSocketByUserId(userId, 'removedFriend', target);
    return { message: `Removed ${target.username} succesfully` };
	}

  async getUserForAuth(usernameOrEmail: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail },
          { email: usernameOrEmail },
        ],
      },
    });
  }

  //todo: delete the email part?
  async getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | null> {
    if (usernameOrEmail == null)
      return null;
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail },
          { email: usernameOrEmail },
        ],
      },
    });
    if (!user) {
      console.log ('not found by UsernameOrEmail')
      return null;
    }
    console.log(`found ${user.username}, sock: ${user.socket}`);
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
    console.log (`fetching friends for user: ${userId}`);
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

  //todo: error catching if no user?
  async getUserById(userId: number) {
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
  
    console.log(`${user.username} is ingame?: ${user.isInGame}`);
  }

  async setIsInQueue(userId: number, bool: boolean): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isInQueue: bool },
    });
  
    console.log(`${user.username} is inqueue?: ${user.isInQueue}`);
  }


  async deleteUser(id: number): Promise<User> {
    const user = await this.getUserById(id);
  
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
  
    // Find all users who have this user in their friends list
    const friends = await this.prisma.user.findMany({
      where: {
        friends: {
          has: id,
        },
      },
    });
  
    // Update each friend's friends list to remove the deleted user's ID
    for (const friend of friends) {
      await this.prisma.user.update({
        where: { id: friend.id },
        data: {
          friends: {
            set: friend.friends.filter((friendId) => friendId !== id), // Remove the deleted user's ID
          },
        },
      });
    }
    // disconnect user from all channels they were in.
    for (const channels in user.channels) {
      console.log(`channel: ${channels}`);
      await this.prisma.channel.update({
        where: {name: channels},
        data: {
          users: {
            disconnect: { username: user.username }
          }
        }
        
      });
    }
 
    return this.prisma.user.delete({
      where: { id },
    });
  }

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
}
