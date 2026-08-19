import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { MenuService } from '../menu/menu.service';

@Injectable()
export class AiService {
  constructor(
    private readonly menuService: MenuService,
  ) {}

  async chat(
    message: string,
    restaurantId?: number,
  ) {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'GROQ_API_KEY is not configured',
      );
    }

    try {
      let menuContext = '';
      let restaurantContext = '';

      if (restaurantId) {
        const menu =
          await this.menuService.getMenuByRestaurant(
            restaurantId,
            {
              limit: 50,
              offset: 0,
            },
          );

        if (menu.restaurant) {
          restaurantContext = `
SELECTED RESTAURANT:
Restaurant ID: ${menu.restaurant.id}
Restaurant Name: ${menu.restaurant.name}
Restaurant Address: ${menu.restaurant.address}
Restaurant City: ${
            menu.restaurant.city ?? 'Unknown'
          }
`;
        }

        const availableItems =
          menu.items.filter(
            (item) => item.isAvailable,
          );

        menuContext = availableItems
          .map((item) => {
            const price =
              item.discountPrice
                ? `₹${item.discountPrice} (original ₹${item.price})`
                : `₹${item.price}`;

            return [
              `Name: ${item.name}`,
              `Price: ${price}`,
              `Type: ${item.foodType}`,
              `Category: ${
                item.category?.name ??
                'Unknown'
              }`,
              `Description: ${
                item.description ?? 'N/A'
              }`,
              `Ingredients: ${
                item.ingredients ?? 'N/A'
              }`,
              `Rating: ${
                item.rating ?? 'N/A'
              }`,
              `Best Seller: ${
                item.isBestSelling
                  ? 'Yes'
                  : 'No'
              }`,
            ].join(' | ');
          })
          .join('\n');
      }

      const systemPrompt = restaurantId
        ? `
You are Foodyply AI, a friendly food ordering assistant.

You are helping the customer order from the selected restaurant.

${restaurantContext}

IMPORTANT RULES:

1. Only recommend food items that exist in the provided menu.
2. Never invent a food item.
3. Never claim an unavailable item is available.
4. If the customer asks for vegetarian food, recommend only items with Type: VEG.
5. If the customer asks for non-vegetarian food, recommend only items with Type: NON_VEG.
6. If the customer gives a budget, only recommend items within that budget.
7. Always mention the actual price.
8. If a discount price exists, use the discounted price.
9. If the customer asks which restaurant an item is from, use the actual selected restaurant name above.
10. If the customer asks about availability, use only the provided menu.
11. If the customer asks about best sellers, use items marked Best Seller: Yes.
12. If the customer asks about ratings, use the actual rating.
13. If a requested item does not exist in the menu, clearly say it is not available.
14. Never invent restaurant names, dishes, prices, ratings, ingredients, or availability.
15. Keep responses concise, friendly and useful.
16. Use emojis naturally without overusing them.

AVAILABLE MENU:

${
  menuContext ||
  'The selected restaurant has no available menu items.'
}
`
        : `
You are Foodyply AI, a friendly food ordering assistant.

The customer currently does NOT have a restaurant selected.

You do NOT have access to any restaurant's menu.

IMPORTANT RULES:

1. Do NOT recommend specific restaurant menu items.
2. Do NOT invent food items or restaurant names.
3. Do NOT claim that any food item is currently available.
4. You may provide general food-related guidance.
5. If the customer asks for restaurant-specific recommendations, menu items, prices, availability, best sellers, vegetarian options, non-vegetarian options, or dishes under a budget, explain that a restaurant must be selected first.
6. Tell the customer to log in/sign up if necessary and select a restaurant based on their location.
7. Keep the response short and friendly.
8. Use emojis naturally.

The customer has no restaurant context right now.

If the customer asks for restaurant-specific food recommendations, respond along the lines of:

"🍽️ I’d love to help! Please log in/sign up and select a restaurant near your location first. Once you select a restaurant, I can check its actual menu and recommend dishes for you."

Do not pretend that you have access to restaurant menus.
`;

      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
            Authorization: `Bearer ${apiKey}`,
          },

          body: JSON.stringify({
            model: 'openai/gpt-oss-20b',

            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              {
                role: 'user',
                content: message,
              },
            ],

            temperature: 0.4,
          }),
        },
      );

      if (!response.ok) {
        const errorBody =
          await response.text();

        console.error(
          `Groq API Error ${response.status}: ${errorBody}`,
        );

        throw new InternalServerErrorException(
          `AI service request failed: ${response.status}`,
        );
      }

      const data =
        await response.json();

      return {
        message:
          data.choices?.[0]?.message
            ?.content ??
          'No response generated.',
      };
    } catch (error) {
      if (
        error instanceof
        InternalServerErrorException
      ) {
        throw error;
      }

      console.error(
        'Foodyply AI Error:',
        error,
      );

      throw new InternalServerErrorException(
        'AI service request failed',
      );
    }
  }
}