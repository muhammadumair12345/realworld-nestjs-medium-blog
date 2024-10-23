import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

import { AuthProvidersEnum } from '@src/auth/auth-providers.enum';
import { ERROR_MESSAGES } from '@src/common/constants';
import {
  FORBIDDEN,
  NOT_FOUND,
  UNPROCESSABLE_ENTITY,
  CustomException,
} from '@src/common/exceptions';
import { FilesService } from '@src/files/files.service';
import { RoleEnum } from '@src/roles/roles.enum';
import { StatusEnum } from '@src/statuses/statuses.enum';
import { DeepPartial } from '@src/utils/types/deep-partial.type';
import { NullableType } from '@src/utils/types/nullable.type';
import { IPaginationOptions } from '@src/utils/types/pagination-options';
import { UserSummary } from '@src/views/domain/user-summary';
import { ViewsService } from '@src/views/views.service';

import { User } from './domain/user';
import { CreateUserDto } from './dto/create-user.dto';
import { FilterUserDto, SortUserDto } from './dto/query-user.dto';
import { FollowEntity } from './infrastructure/persistence/relational/entities/follow.entity';
import { UserAbstractRepository } from './infrastructure/persistence/user.abstract.repository';



@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserAbstractRepository,
    private readonly filesService: FilesService,
    private readonly viewsService: ViewsService,
    @InjectRepository(FollowEntity)
    private readonly followRepository: Repository<FollowEntity>
  ) {}

  async create(createProfileDto: CreateUserDto): Promise<User> {
    const clonedPayload = {
      provider: AuthProvidersEnum.email,
      ...createProfileDto,
    };

    if (clonedPayload.password) {
      const salt = await bcrypt.genSalt();
      clonedPayload.password = await bcrypt.hash(clonedPayload.password, salt);
    }

    if (clonedPayload.email) {
      const userObject = await this.usersRepository.findByEmail(
        clonedPayload.email,
      );
      if (userObject) {
        throw FORBIDDEN(ERROR_MESSAGES.ALREADY_EXISTS('email'), 'email');
      }
    }

    if (clonedPayload.photo?.id) {
      const fileObject = await this.filesService.findById(
        clonedPayload.photo.id,
      );
      if (!fileObject) {
        throw NOT_FOUND('File', { id: clonedPayload.photo.id });
      }
      clonedPayload.photo = fileObject;
    }

    if (clonedPayload.role?.id) {
      const roleObject = Object.values(RoleEnum)
        .map(String)
        .includes(String(clonedPayload.role.id));
      if (!roleObject) {
        throw NOT_FOUND('Role', { id: clonedPayload.role.id });
      }
    }

    if (clonedPayload.status?.id) {
      const statusObject = Object.values(StatusEnum)
        .map(String)
        .includes(String(clonedPayload.status.id));
      if (!statusObject) {
        throw NOT_FOUND('Status', { id: clonedPayload.status.id });
      }
    }

    return this.usersRepository.create(clonedPayload);
  }

  findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<User[]> {
    return this.usersRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  findById(id: User['id']): Promise<NullableType<User>> {
    return this.findAndValidate('id', id);
  }

  findByEmail(email: User['email']): Promise<NullableType<User>> {
    return this.usersRepository.findByEmail(email);
  }

  findBySocialIdAndProvider({
    socialId,
    provider,
  }: {
    socialId: User['socialId'];
    provider: User['provider'];
  }): Promise<NullableType<User>> {
    return this.usersRepository.findBySocialIdAndProvider({
      socialId,
      provider,
    });
  }

  async update(
    id: User['id'],
    payload: DeepPartial<User>,
  ): Promise<User | null> {
    const clonedPayload = { ...payload };

    if (
      clonedPayload.password &&
      clonedPayload.previousPassword !== clonedPayload.password
    ) {
      const salt = await bcrypt.genSalt();
      clonedPayload.password = await bcrypt.hash(clonedPayload.password, salt);
    }

    if (clonedPayload.email) {
      const userObject = await this.usersRepository.findByEmail(
        clonedPayload.email,
      );

      if (userObject && userObject.id !== id) {
        throw FORBIDDEN(ERROR_MESSAGES.ALREADY_EXISTS('email'), 'email');
      }
    }

    if (clonedPayload.photo?.id) {
      const fileObject = await this.filesService.findById(
        clonedPayload.photo.id,
      );
      if (!fileObject) {
        throw NOT_FOUND('File', { id: clonedPayload.photo.id });
      }
      clonedPayload.photo = fileObject;
    }

    if (clonedPayload.role?.id) {
      const roleObject = Object.values(RoleEnum)
        .map(String)
        .includes(String(clonedPayload.role.id));
      if (!roleObject) {
        throw NOT_FOUND('Role', { id: clonedPayload.role.id });
      }
    }

    if (clonedPayload.status?.id) {
      const statusObject = Object.values(StatusEnum)
        .map(String)
        .includes(String(clonedPayload.status.id));
      if (!statusObject) {
        throw NOT_FOUND('Status', { id: clonedPayload.status.id });
      }
    }

    return this.usersRepository.update(id, clonedPayload);
  }

  async remove(id: User['id']): Promise<void> {
    await this.usersRepository.remove(id);
  }

  async findAndValidate(field, value, fetchRelations = false) {
    const repoFunction = `findBy${field.charAt(0).toUpperCase()}${field.slice(1)}${fetchRelations ? 'WithRelations' : ''}`; // captilize first letter of the field name
    if (typeof this.usersRepository[repoFunction] !== 'function') {
      throw UNPROCESSABLE_ENTITY(
        `Method ${repoFunction} not found on user repository.`,
        'id',
      );
    }

    const user = await this.usersRepository[repoFunction](value);
    if (!user) {
      throw NOT_FOUND('User', { [field]: value });
    }
    return user;
  }

  getUsersSummary(): Promise<UserSummary[]> {
    return this.viewsService.getUsersSummary();
  }

  getUserSummary(id: User['id']): Promise<NullableType<UserSummary>> {
    const userSummaryView = this.viewsService.getUsersSummaryView();
    return this.usersRepository.getUserSummary(id, userSummaryView);
  }

  async unfollowUser(followerId: number, username: string): Promise<any> {

    const followingUser = await this.usersRepository.findByUserName(username);
    if (!followingUser) {
      throw NOT_FOUND('User', { firstName: username });
    }
  
    // Prevent unfollowing oneself
    if (followerId === followingUser.id) {
      throw CustomException('You cannot unfollow yourself', 'unfollow');
    }
  
    const existingFollow = await this.followRepository.findOne({
      where: {
        follower_id: followerId,
        following_id: Number(followingUser.id),
      },
    });
  
    
     if(existingFollow){
      await this.followRepository.remove(existingFollow);  
     }
    
    const followerProfile = await this.findAndValidate('id', followerId);
    
    return {
      id: followerProfile.id,
      username: followerProfile.firstName,
      followingUser: {
        id: followingUser.id,
        username: followingUser.firstName,
        isFollowing: false,
      },
    };
  }
  
  

  async followUser(followerId: number, username: string): Promise<any> {
  
    const followingUser = await this.usersRepository.findByUserName(username);
    if (!followingUser) {
      throw NOT_FOUND('User', { firstName: username });
    }

    // Prevent following oneself
    if (followerId === followingUser.id) {
      throw CustomException('You cannot follow yourself', 'follow');
    }

      const existingFollow = await this.followRepository.findOne({
        where: {
          follower_id: followerId,
          following_id: Number(followingUser.id),
        },
      });
   
        if (!existingFollow) {
          const follow = this.followRepository.create({
            follower_id: followerId,
            following_id:Number( followingUser.id),
          });
      
           await this.followRepository.save(follow);
        }
    
        const followerProfile =  await this.findAndValidate('id', followerId);
        return {
          id: followerProfile.id,
          username: followerProfile.firstName,
          followingUser: {
            id: followingUser.id,
            username: followingUser.firstName,
            isFollowing: true, 
          },
        };
  }
}
