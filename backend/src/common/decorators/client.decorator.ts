import { SetMetadata, CustomDecorator } from '@nestjs/common';

export const ALLOW_WEB_KEY = 'allowWeb';

export const AllowWeb = (): CustomDecorator<string> => SetMetadata(ALLOW_WEB_KEY, true);
