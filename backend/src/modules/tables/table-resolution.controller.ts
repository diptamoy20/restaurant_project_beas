import { Controller, Get, Param } from '@nestjs/common';
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
