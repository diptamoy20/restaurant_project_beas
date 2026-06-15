import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { CreateTableDto } from './dto/create-table.dto';
import { DownloadQrQueryDto } from './dto/download-qr-query.dto';
import { ListTablesQueryDto } from './dto/list-tables-query.dto';
import { TableResponseDto, TableSessionResponseDto } from './dto/table-response.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { TableSessionsService } from './table-sessions.service';
import { TablesService } from './tables.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Admin Tables')
@Controller('admin/tables')
@Roles(Role.ADMIN, Role.MANAGER)
@ApiStandardErrorResponses({ badRequest: true, notFound: true })
export class AdminTablesController {
  constructor(
    private readonly tablesService: TablesService,
    private readonly tableSessionsService: TableSessionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List restaurant tables' })
  @ApiOkResponse({ type: TableResponseDto, isArray: true })
  listTables(@Query() query: ListTablesQueryDto): Promise<PaginatedResult<TableResponseDto>> {
    return this.tablesService.listTables(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get table details' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: TableResponseDto })
  getTable(@Param('id', ParseIntPipe) id: number): Promise<TableResponseDto> {
    return this.tablesService.getTableById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create table' })
  @ApiCreatedResponse({ type: TableResponseDto })
  createTable(@Body() dto: CreateTableDto): Promise<TableResponseDto> {
    return this.tablesService.createTable(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update table' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: TableResponseDto })
  updateTable(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTableDto,
  ): Promise<TableResponseDto> {
    return this.tablesService.updateTable(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete table' })
  @ApiParam({ name: 'id', type: Number })
  deleteTable(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.tablesService.deleteTable(id);
  }

  @Post(':id/qr/generate')
  @ApiOperation({ summary: 'Generate QR code for table' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: TableResponseDto })
  generateQr(@Param('id', ParseIntPipe) id: number): Promise<TableResponseDto> {
    return this.tablesService.generateQr(id, false);
  }

  @Post(':id/qr/regenerate')
  @ApiOperation({ summary: 'Regenerate QR code for table' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: TableResponseDto })
  regenerateQr(@Param('id', ParseIntPipe) id: number): Promise<TableResponseDto> {
    return this.tablesService.generateQr(id, true);
  }

  @Get(':id/qr/download')
  @ApiOperation({ summary: 'Download table QR code' })
  @ApiParam({ name: 'id', type: Number })
  @Header('Cache-Control', 'no-store')
  async downloadQr(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: DownloadQrQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const format = query.format ?? 'png';
    const { file, fileName, contentType } = await this.tablesService.downloadQr(id, format);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return file;
  }
}

@ApiTags('Admin Table Sessions')
@Controller('admin/table-sessions')
@Roles(Role.ADMIN, Role.MANAGER)
@ApiStandardErrorResponses({ badRequest: true, notFound: true })
export class AdminTableSessionsController {
  constructor(private readonly tableSessionsService: TableSessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List table sessions' })
  @ApiOkResponse({ type: TableSessionResponseDto, isArray: true })
  listSessions(
    @Query('restaurantId') restaurantId?: string,
    @Query('status') status?: 'ACTIVE' | 'CLOSED',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<PaginatedResult<TableSessionResponseDto>> {
    return this.tableSessionsService.listSessions({
      restaurantId: restaurantId ? Number(restaurantId) : undefined,
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session details' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: TableSessionResponseDto })
  getSession(@Param('id', ParseIntPipe) id: number): Promise<TableSessionResponseDto> {
    return this.tableSessionsService.getSessionById(id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close table session' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: TableSessionResponseDto })
  closeSession(@Param('id', ParseIntPipe) id: number): Promise<TableSessionResponseDto> {
    return this.tableSessionsService.closeSession(id);
  }
}
