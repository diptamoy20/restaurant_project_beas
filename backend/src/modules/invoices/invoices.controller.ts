import { Controller, Get, Param, ParseIntPipe, Req, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';

import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { InvoicesService } from './invoices.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('orders/:orderId/invoice')
@ApiTags('Invoices')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER)
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get invoice availability and details for an order' })
  @ApiParam({ name: 'orderId', type: Number })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiStandardErrorResponses({ notFound: true })
  getInvoice(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.getInvoiceForOrder(orderId, request.user);
  }

  @Get('download')
  @ApiOperation({ summary: 'Download order invoice PDF' })
  @ApiParam({ name: 'orderId', type: Number })
  @ApiProduces('application/pdf')
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  async downloadInvoice(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() request: { user: AuthenticatedUser },
    @Res() response: any,
  ): Promise<void> {
    const file = await this.invoicesService.downloadInvoicePdf(orderId, request.user);

    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    response.send(file.buffer);
  }
}
