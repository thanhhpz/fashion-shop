// src/modules/users/users.controller.ts
import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('Quản trị hệ thống', 'Quản lý')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('Quản trị hệ thống', 'Quản lý')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles('Quản trị hệ thống', 'Quản lý')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Put(':id')
  @Roles('Quản trị hệ thống', 'Quản lý')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Roles('Quản trị hệ thống')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @Post(':id/restore')
  @Roles('Quản trị hệ thống')
  restore(@Param('id') id: string) {
    return this.usersService.restore(+id);
  }

  @Post(':id/assign-role/:roleName')
  @Roles('Quản trị hệ thống')
  assignRole(@Param('id') id: string, @Param('roleName') roleName: string) {
    return this.usersService.assignRole(+id, roleName);
  }
}