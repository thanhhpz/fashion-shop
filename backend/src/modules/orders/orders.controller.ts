// src/modules/orders/orders.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto, UpdateOrderStatusDto } from './dto/update-order.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(@Request() req, @Body() dto: CreateOrderDto) {
    const data = await this.ordersService.createOrder(req.user.id, dto);
    return { success: true, data };
  }

  @Get('my-orders')
  async getUserOrders(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.ordersService.getUserOrders(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      status,
    );
    return { success: true, data };
  }

  @Get(':id')
  async getOrderDetail(@Param('id', ParseIntPipe) id: number) {
    const data = await this.ordersService.getOrderDetail(id);
    return { success: true, data };
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('Quản trị hệ thống', 'Quản lý')
  async getAllOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('payment_status') paymentStatus?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    const data = await this.ordersService.getAllOrders(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      { status, payment_status: paymentStatus, date_from: dateFrom, date_to: dateTo },
    );
    return { success: true, data };
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles('Quản trị hệ thống', 'Quản lý', 'Nhân viên')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req,
  ) {
    const data = await this.ordersService.updateOrderStatus(id, dto, req.user.id);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('Quản trị hệ thống', 'Quản lý')
  async updateOrder(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    const data = await this.ordersService.updateOrder(id, dto);
    return { success: true, data };
  }

  @Get('statuses/list')
  async getOrderStatuses() {
    const data = await this.ordersService.getOrderStatuses();
    return { success: true, data };
  }
}