import { Controller,  Post, Body, Put, Get, Delete,  } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/request/create-user.dto';
import { CreateUserResDto } from './dto/response';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() dto: CreateUserDto) {
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
