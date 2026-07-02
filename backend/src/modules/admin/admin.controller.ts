// backend/src/modules/admin/admin.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Quản trị hệ thống', 'Quản lý')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============================================================
  // DASHBOARD
  // ============================================================
  @Get('dashboard')
  async getDashboard() {
    const data = await this.adminService.getDashboardStats();
    return { success: true, data };
  }

  // ============================================================
  // DANH MỤC
  // ============================================================
  @Get('categories')
  async getAllCategories() {
    const data = await this.adminService.getAllCategories();
    return { success: true, data };
  }

  @Get('categories/:id')
  async getCategoryById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adminService.getCategoryById(id);
    return { success: true, data };
  }

  @Post('categories')
  async createCategory(@Body() body: { ten_danh_muc: string; mo_ta?: string; slug: string; danh_muc_cha_id?: number }) {
    const data = await this.adminService.createCategory(body);
    return { success: true, data };
  }

  @Put('categories/:id')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { ten_danh_muc?: string; mo_ta?: string; slug?: string; trang_thai?: boolean },
  ) {
    const data = await this.adminService.updateCategory(id, body);
    return { success: true, data };
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adminService.deleteCategory(id);
    return { success: true, data };
  }

  // ============================================================
  // THƯƠNG HIỆU
  // ============================================================
  @Get('brands')
  async getAllBrands() {
    const data = await this.adminService.getAllBrands();
    return { success: true, data };
  }

  @Get('brands/:id')
  async getBrandById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adminService.getBrandById(id);
    return { success: true, data };
  }

  @Post('brands')
  async createBrand(@Body() body: { ten_thuong_hieu: string; logo?: string; mo_ta?: string }) {
    const data = await this.adminService.createBrand(body);
    return { success: true, data };
  }

  @Put('brands/:id')
  async updateBrand(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { ten_thuong_hieu?: string; logo?: string; mo_ta?: string; trang_thai?: boolean },
  ) {
    const data = await this.adminService.updateBrand(id, body);
    return { success: true, data };
  }

  @Delete('brands/:id')
  async deleteBrand(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adminService.deleteBrand(id);
    return { success: true, data };
  }

  // ============================================================
  // MÀU SẮC
  // ============================================================
  @Get('colors')
  async getAllColors() {
    const data = await this.adminService.getAllColors();
    return { success: true, data };
  }

  @Get('colors/:id')
  async getColorById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adminService.getColorById(id);
    return { success: true, data };
  }

  @Post('colors')
  async createColor(@Body() body: { ten_mau: string; ma_hex: string; mo_ta?: string }) {
    const data = await this.adminService.createColor(body);
    return { success: true, data };
  }

  @Put('colors/:id')
  async updateColor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { ten_mau?: string; ma_hex?: string; mo_ta?: string; trang_thai?: boolean },
  ) {
    const data = await this.adminService.updateColor(id, body);
    return { success: true, data };
  }

  @Delete('colors/:id')
  async deleteColor(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adminService.deleteColor(id);
    return { success: true, data };
  }

  // ============================================================
  // KÍCH CỠ
  // ============================================================
  @Get('sizes')
  async getAllSizes() {
    const data = await this.adminService.getAllSizes();
    return { success: true, data };
  }

  @Get('sizes/:id')
  async getSizeById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adminService.getSizeById(id);
    return { success: true, data };
  }

  @Post('sizes')
  async createSize(@Body() body: { ten_kich_co: string; mo_ta?: string }) {
    const data = await this.adminService.createSize(body);
    return { success: true, data };
  }

  @Put('sizes/:id')
  async updateSize(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { ten_kich_co?: string; mo_ta?: string; trang_thai?: boolean },
  ) {
    const data = await this.adminService.updateSize(id, body);
    return { success: true, data };
  }

  @Delete('sizes/:id')
  async deleteSize(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adminService.deleteSize(id);
    return { success: true, data };
  }

  // ============================================================
  // TAGS
  // ============================================================
  @Get('tags')
  async getAllTags() {
    const data = await this.adminService.getAllTags();
    return { success: true, data };
  }

  @Get('tags/:id')
  async getTagById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adminService.getTagById(id);
    return { success: true, data };
  }

  @Post('tags')
  async createTag(@Body() body: { ten_tag: string; mo_ta?: string }) {
    const data = await this.adminService.createTag(body);
    return { success: true, data };
  }

  @Put('tags/:id')
  async updateTag(@Param('id', ParseIntPipe) id: number, @Body() body: { ten_tag?: string; mo_ta?: string }) {
    const data = await this.adminService.updateTag(id, body);
    return { success: true, data };
  }

  @Delete('tags/:id')
  async deleteTag(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adminService.deleteTag(id);
    return { success: true, data };
  }

  // ============================================================
  // SẢN PHẨM
  // ============================================================
  @Get('products')
  async getProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.adminService.getProducts({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      brandId: brandId ? parseInt(brandId) : undefined,
      status,
    });
    return { success: true, data };
  }

  @Get('products/:id')
  async getProductById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adminService.getProductById(id);
    return { success: true, data };
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adminService.deleteProduct(id);
    return { success: true, data };
  }
  @Put('products/:id')
async updateProduct(
  @Param('id', ParseIntPipe) id: number,
  @Body() body: any,
) {
  const data = await this.adminService.updateProduct(id, body);
  return { success: true, data };
}
}