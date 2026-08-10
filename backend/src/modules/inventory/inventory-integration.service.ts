import { Injectable, Logger } from '@nestjs/common';

interface ErpTokenCache {
  token: string;
  expiresAt: number;
}

@Injectable()
export class InventoryIntegrationService {
  private readonly logger = new Logger(InventoryIntegrationService.name);
  private readonly erpBaseUrl: string;
  private readonly erpEmail: string;
  private readonly erpPassword: string;
  private tokenCache: ErpTokenCache | null = null;

  constructor() {
    this.erpBaseUrl = process.env.INVENTORY_ERP_URL || 'http://localhost:4001';
    this.erpEmail = process.env.INVENTORY_ERP_SERVICE_EMAIL || 'admin@inventory.com';
    this.erpPassword = process.env.INVENTORY_ERP_SERVICE_PASSWORD || 'Admin@123';
  }

  private async getAuthToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    this.logger.log('Authenticating with Inventory ERP service account...');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${this.erpBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.erpEmail, password: this.erpPassword }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          `ERP login failed (${response.status}): ${body.message || 'Unknown error'}`,
        );
      }

      const data = await response.json();
      this.tokenCache = {
        token: data.accessToken,
        expiresAt: Date.now() + 55 * 60 * 1000,
      };

      this.logger.log('Inventory ERP service account authenticated successfully');
      return this.tokenCache.token;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Inventory ERP login timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async erpFetch(path: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAuthToken();
    const url = `${this.erpBaseUrl}/api${path}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    };

    this.logger.log(`ERP Proxy -> ${options.method || 'GET'} ${url}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (response.status === 401) {
        this.tokenCache = null;
        this.logger.warn('ERP token expired, retrying with fresh token...');
        return this.erpFetch(path, options);
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        this.logger.error(`ERP API error ${response.status}: ${JSON.stringify(errorBody)}`);
        throw new Error(errorBody.message || `ERP API returned ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.logger.error(`ERP API timeout for ${url}`);
        throw new Error('Inventory ERP request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getStoreInventory(restaurantId: number) {
    return this.erpFetch(`/stock-movement/store/stock?restaurantId=${restaurantId}`);
  }

  async getKitchenInventory(restaurantId: number) {
    return this.erpFetch(`/integration/kitchen-inventory?restaurantId=${restaurantId}`);
  }

  async checkAvailability(restaurantId: number, menuItemId: number, quantity: number = 1) {
    return this.erpFetch(
      `/integration/availability?restaurantId=${restaurantId}&menuItemId=${menuItemId}&quantity=${quantity}`,
    );
  }

  async getKitchenRequests(restaurantId: number) {
    return this.erpFetch(`/integration/kitchen-requests?restaurantId=${restaurantId}`);
  }

  async createKitchenRequest(
    restaurantId: number,
    requestedById: number,
    dto: { notes?: string; items: Array<{ ingredientId: number; quantity: number }> },
  ) {
    return this.erpFetch('/integration/kitchen-requests', {
      method: 'POST',
      body: JSON.stringify({ restaurantId, requestedById, ...dto }),
    });
  }

  async getKitchenTransfers(restaurantId: number) {
    return this.erpFetch(`/integration/kitchen-transfers?restaurantId=${restaurantId}`);
  }

  async getDashboard(restaurantId: number) {
    return this.erpFetch(`/integration/dashboard?restaurantId=${restaurantId}`);
  }

  async getConsumption(restaurantId: number) {
    return this.erpFetch(`/integration/consumption?restaurantId=${restaurantId}`);
  }

  async consumeRecipe(
    restaurantId: number,
    orderId: string,
    orderItems: Array<{ menuItemId: number; quantity: number }>,
  ) {
    return this.erpFetch('/integration/consume-recipe', {
      method: 'POST',
      body: JSON.stringify({ restaurantId, orderId, orderItems }),
    });
  }

  async getTransfers(restaurantId: number) {
    return this.erpFetch(`/stock-movement/transfers?restaurantId=${restaurantId}`);
  }

  async createTransfer(
    restaurantId: number,
    userId: number,
    dto: { notes?: string; items: Array<{ ingredientId: number; quantity: number }> },
  ) {
    return this.erpFetch('/stock-movement/transfers', {
      method: 'POST',
      body: JSON.stringify({ restaurantId, ...dto }),
    });
  }

  async approveTransfer(transferId: number) {
    return this.erpFetch(`/stock-movement/transfers/${transferId}/approve`, {
      method: 'PUT',
    });
  }

  async getRequisitions(restaurantId: number) {
    return this.erpFetch(`/stock-movement/requisitions?restaurantId=${restaurantId}`);
  }

  async createRequisition(
    restaurantId: number,
    dto: { notes?: string; items: Array<{ ingredientId: number; quantity: number }> },
  ) {
    return this.erpFetch('/stock-movement/requisitions', {
      method: 'POST',
      body: JSON.stringify({ restaurantId, ...dto }),
    });
  }

  async fulfillRequisition(requisitionId: number, warehouseId: number) {
    return this.erpFetch(`/stock-movement/requisitions/${requisitionId}/fulfill`, {
      method: 'PUT',
      body: JSON.stringify({ warehouseId }),
    });
  }
}
