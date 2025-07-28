import { Controller,  Post, Body, Put, Get, Delete,  } from '@nestjs/common';
import { UserTcpService } from './user-tcp.service';
import { CreateUserDto } from './dto/request/create-user.dto';
import { CreateUserResDto } from './dto/response';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserTcpService) {}

  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    console.log('create user 123123')
    await this.userService.createUser(dto);
    
  }

  @Put()
  async updateUser(@Body() dto: CreateUserDto) {
    await this.userService.createUser(dto);
    return { message: 'User creation command sent' };
  }

  @Get()
  async getListUser(@Body() dto: CreateUserDto) {
    await this.userService.createUser(dto);
    return { message: 'User creation command sent' };
  }

  @Get()
  async getDetailUser(@Body() dto: CreateUserDto) {
    await this.userService.createUser(dto);
    return { message: 'User creation command sent' };
  }

  @Delete()
  async deleteUser(@Body() dto: CreateUserDto) {
    await this.userService.createUser(dto);
    return { message: 'User creation command sent' };
  }
}
