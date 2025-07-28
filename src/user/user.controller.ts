import { Controller,  Post, Body, Put, Get, Delete, Param,  } from '@nestjs/common';
import { UserTcpService } from './user-tcp.service';
import { CreateUserDto } from './dto/request/create-user.dto';
import { CreateUserResDto } from './dto/response';
import { UpdateUserDto } from './dto/request/update-user.dto';
import { LoginDto } from './dto/request';
import { LoginResDto } from './dto/response/login-res.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserTcpService) {}

  @Post()
  async createUser(@Body() dto: CreateUserDto): Promise<CreateUserResDto> {
    return this.userService.createUser(dto);
  }

  @Post("/login")
  async login(@Body() dto: LoginDto): Promise<LoginResDto> {
    return this.userService.login(dto);
  }

  @Put()
  async updateUser(@Body() dto: UpdateUserDto, @Param() id: string) {
    await this.userService.updateUser(id, dto);
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
