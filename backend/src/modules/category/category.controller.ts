import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';
import { CategoryService } from './category.service';

@ApiTags('categories')
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all asset categories' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (active/inactive)' })
  findAll(@Query('status') status?: string) {
    return this.categoryService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by categoryId' })
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  @ApiBody({ type: CreateCategoryDto })
  create(@Body() body: CreateCategoryDto, @Req() req: any) {
    return this.categoryService.create(body, req.user?.username);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Update a category (Admin only)',
    description: 'categoryId is immutable and cannot be changed.',
  })
  @ApiBody({ type: UpdateCategoryDto })
  update(@Param('id') id: string, @Body() body: UpdateCategoryDto, @Req() req: any) {
    return this.categoryService.update(id, body, req.user?.username);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a category (Admin only)' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.categoryService.remove(id, req.user?.username);
  }
}
