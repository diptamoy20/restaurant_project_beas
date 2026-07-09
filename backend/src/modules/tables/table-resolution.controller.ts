import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { TableResolutionResponseDto } from './dto/table-response.dto';
import { TablesService } from './tables.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Table QR Resolution')
@Controller('table')
@ApiStandardErrorResponses({ notFound: true })
export class TableResolutionController {
  constructor(private readonly tablesService: TablesService) {}

  @Get('resolve/:restaurantId/:tableId')
  @Public()
  @ApiOperation({
    summary: 'Resolve table by restaurant and table ID',
    description:
      'Validates restaurant/table IDs, returns table context, and returns or creates an active dine-in session. Used for legacy menu URLs.',
  })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID', type: Number })
  @ApiParam({ name: 'tableId', description: 'Table ID', type: Number })
  @ApiOkResponse({ type: TableResolutionResponseDto })
  resolveByIds(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('tableId', ParseIntPipe) tableId: number,
  ): Promise<TableResolutionResponseDto> {
    return this.tablesService.resolveTableByIds(restaurantId, tableId);
  }

  @Get(':token')
  @Public()
  @ApiOperation({
    summary: 'Resolve table QR token',
    description:
      'Validates a secure table token, resolves restaurant and table, and returns or creates an active dine-in session.',
  })
  @ApiParam({ name: 'token', description: 'Secure table token from QR code' })
  @ApiOkResponse({ type: TableResolutionResponseDto })
  resolveToken(@Param('token') token: string): Promise<TableResolutionResponseDto> {
    return this.tablesService.resolveTableToken(token);
  }
}
