import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('categories')
  @Permissions('products.read_basic')
  findAllCategories(@CurrentUser() user: AuthUser) {
    return this.productsService.findAllCategories(user.tenantId);
  }

  @Post('categories')
  @Permissions('products.create')
  createCategory(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; description?: string },
  ) {
    return this.productsService.createCategory(
      user.tenantId,
      body.name,
      body.description,
    );
  }

  @Patch('categories/:id')
  @Permissions('products.update')
  updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: { name?: string; description?: string; status?: string },
  ) {
    return this.productsService.updateCategory(user.tenantId, id, body);
  }

  @Delete('categories/:id')
  @Permissions('products.update')
  deleteCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.productsService.deleteCategory(user.tenantId, id);
  }

  @Post('import')
  @Permissions('products.create')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.productsService.importFromCsv(user.tenantId, user.userId, file.buffer);
  }

  @Get()
  @Permissions('products.read_basic')
  findAll(@CurrentUser() user: AuthUser, @Query('take') take?: string) {
    const canViewCost = user.permissions.includes('products.view_cost');
    const limit = Math.min(Math.max(Number(take) || 500, 1), 1000);

    return this.productsService.findAll(user.tenantId, canViewCost, limit);
  }

  @Get(':id')
  @Permissions('products.read_basic')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const canViewCost = user.permissions.includes('products.view_cost');

    return this.productsService.findOne(user.tenantId, id, canViewCost);
  }

  @Post()
  @Permissions('products.create')
  create(
    @CurrentUser() user: AuthUser,
    @Body() createProductDto: CreateProductDto,
  ) {
    const canViewCost = user.permissions.includes('products.view_cost');

    return this.productsService.create(
      user.tenantId,
      user.userId,
      createProductDto,
      canViewCost,
    );
  }

  @Patch(':id')
  @Permissions('products.update')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const canViewCost = user.permissions.includes('products.view_cost');

    return this.productsService.update(
      user.tenantId,
      user.userId,
      id,
      updateProductDto,
      canViewCost,
    );
  }

  @Patch(':id/archive')
  @Permissions('products.archive')
  archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const canViewCost = user.permissions.includes('products.view_cost');

    return this.productsService.archive(
      user.tenantId,
      user.userId,
      id,
      canViewCost,
    );
  }
}
