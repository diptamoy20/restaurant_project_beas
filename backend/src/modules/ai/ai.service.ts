import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { MenuService } from '../menu/menu.service';
import { RestaurantsService } from '../restaurants/restaurants.service';

export interface ChatResponse {
  message: string;

  restaurant?: {
    id: number;
    name: string;
    address?: string | null;
    city?: string | null;
  } | null;

  restaurants?: Array<{
    id: number;
    name: string;
    address?: string | null;
    city?: string | null;
  }>;
}

interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiService {
  constructor(
    private readonly menuService: MenuService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  async chat(
    message: string,
    restaurantId?: number,
    history: ChatHistoryMessage[] = [],
  ): Promise<ChatResponse> {
    const apiKey =
      process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'GROQ_API_KEY is not configured',
      );
    }

    const userMessage =
      message?.trim();

    if (!userMessage) {
      throw new InternalServerErrorException(
        'Message is required',
      );
    }

    try {
      const lowerMessage =
        userMessage.toLowerCase();

      /*
       * Show all restaurants.
       */
      if (
        this.isRestaurantListRequest(
          lowerMessage,
        )
      ) {
        const result =
          await this.restaurantsService.getRestaurants(
            {
              limit: 20,
              offset: 0,
            },
          );

        if (!result.items?.length) {
          return {
            message:
              '🍽️ I could not find any active restaurants right now.',
            restaurants: [],
          };
        }

        const restaurants =
          result.items.map(
            (restaurant) => ({
              id: restaurant.id,
              name: restaurant.name,
              address:
                restaurant.address,
              city: restaurant.city,
            }),
          );

        const restaurantText =
          restaurants
            .map(
              (
                restaurant,
                index,
              ) =>
                `${index + 1}. ${
                  restaurant.name
                }${
                  restaurant.city
                    ? ` — ${restaurant.city}`
                    : ''
                }`,
            )
            .join('\n');

        return {
          message:
            `🍽️ Here are the available restaurants:\n\n${restaurantText}\n\nTell me the restaurant number or name you want to explore.`,
          restaurants,
        };
      }

      let selectedRestaurantId =
        restaurantId;

      let selectedRestaurant: any =
        null;

      /*
       * If the frontend does not already
       * provide a restaurant ID, allow
       * the user to select one by number.
       */
      if (!selectedRestaurantId) {
        const number =
          Number(userMessage);

        if (
          Number.isInteger(number) &&
          number >= 1
        ) {
          const result =
            await this.restaurantsService.getRestaurants(
              {
                limit: 20,
                offset: 0,
              },
            );

          if (
            result.items?.length &&
            number <=
              result.items.length
          ) {
            selectedRestaurant =
              result.items[number - 1];

            selectedRestaurantId =
              selectedRestaurant.id;
          }
        }
      }

      /*
       * Try finding a restaurant
       * by its name.
       */
      if (!selectedRestaurantId) {
        const restaurantSearch =
          await this.tryFindRestaurant(
            userMessage,
          );

        if (
          restaurantSearch &&
          restaurantSearch.items
            ?.length
        ) {
          if (
            restaurantSearch.items
              .length === 1
          ) {
            selectedRestaurant =
              restaurantSearch.items[0];

            selectedRestaurantId =
              selectedRestaurant.id;

            return {
              message:
                `Great! 🍽️ I've selected **${selectedRestaurant.name}**.\n\nWould you like to see the menu, get food recommendations, or book a table?`,
              restaurant: {
                id:
                  selectedRestaurant.id,
                name:
                  selectedRestaurant.name,
                address:
                  selectedRestaurant.address,
                city:
                  selectedRestaurant.city,
              },
            };
          }

          const restaurants =
            restaurantSearch.items.map(
              (restaurant) => ({
                id: restaurant.id,
                name: restaurant.name,
                address:
                  restaurant.address,
                city: restaurant.city,
              }),
            );

          const text =
            restaurants
              .map(
                (
                  restaurant,
                  index,
                ) =>
                  `${index + 1}. ${restaurant.name}`,
              )
              .join('\n');

          return {
            message:
              `I found multiple restaurants matching that name:\n\n${text}\n\nPlease tell me which one you'd like to select.`,
            restaurants,
          };
        }
      }

      /*
       * No restaurant selected.
       */
      if (!selectedRestaurantId) {
        return {
          message:
            `🍽️ I'd love to help! Please choose a restaurant first.\n\nYou can say **"list all restaurants"** and I'll show you the available restaurants.`,
        };
      }

      /*
       * Get selected restaurant.
       */
      if (!selectedRestaurant) {
        selectedRestaurant =
          await this.restaurantsService.getRestaurant(
            selectedRestaurantId,
          );
      }

      if (!selectedRestaurant) {
        throw new NotFoundException(
          'Restaurant not found',
        );
      }

      /*
       * IMPORTANT:
       *
       * If user asks for another/different
       * restaurant, return real restaurants
       * from the database.
       *
       * Do NOT ask Groq to generate them.
       */
      if (
        this.isOtherRestaurantRequest(
          lowerMessage,
        )
      ) {
        const result =
          await this.restaurantsService.getRestaurants(
            {
              limit: 20,
              offset: 0,
            },
          );

        const otherRestaurants =
          (result.items ?? [])
            .filter(
              (restaurant) =>
                restaurant.id !==
                selectedRestaurantId,
            )
            .map(
              (restaurant) => ({
                id: restaurant.id,
                name: restaurant.name,
                address:
                  restaurant.address,
                city: restaurant.city,
              }),
            );

        if (
          !otherRestaurants.length
        ) {
          return {
            message:
              '🍽️ There are no other restaurants available right now.',
            restaurants: [],
          };
        }

        const restaurantText =
          otherRestaurants
            .map(
              (
                restaurant,
                index,
              ) =>
                `${index + 1}. ${
                  restaurant.name
                }${
                  restaurant.city
                    ? ` — ${restaurant.city}`
                    : ''
                }`,
            )
            .join('\n');

        return {
          message:
            `🍽️ Here are some other available restaurants:\n\n${restaurantText}\n\nTell me the restaurant number or name you'd like to explore.`,
          restaurants:
            otherRestaurants,
        };
      }

      /*
       * Get menu for selected restaurant.
       */
      const menu =
        await this.menuService.getMenuByRestaurant(
          selectedRestaurantId,
          {
            limit: 50,
            offset: 0,
          },
        );

      const availableItems =
        menu.items.filter(
          (item) =>
            item.isAvailable,
        );

      const menuContext =
        availableItems
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
                item.description ??
                'N/A'
              }`,
              `Ingredients: ${
                item.ingredients ??
                'N/A'
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

      /*
       * Load real restaurants so that
       * Groq knows which restaurants
       * actually exist.
       */
      let otherRestaurantsContext =
        '';

      try {
        const restaurantResult =
          await this.restaurantsService.getRestaurants(
            {
              limit: 20,
              offset: 0,
            },
          );

        const otherRestaurants =
          (restaurantResult.items ??
            [])
            .filter(
              (restaurant) =>
                restaurant.id !==
                selectedRestaurantId,
            );

        otherRestaurantsContext =
          otherRestaurants
            .map((restaurant) =>
              [
                `ID: ${restaurant.id}`,
                `Name: ${restaurant.name}`,
                `Address: ${
                  restaurant.address ??
                  'Unknown'
                }`,
                `City: ${
                  restaurant.city ??
                  'Unknown'
                }`,
              ].join(' | '),
            )
            .join('\n');
      } catch (error) {
        console.error(
          'Could not load other restaurants:',
          error,
        );
      }

      const systemPrompt = `
You are Foodyply AI, a friendly restaurant assistant.

The user has selected this restaurant:

RESTAURANT:
Name: ${selectedRestaurant.name}
ID: ${selectedRestaurant.id}
Address: ${
        selectedRestaurant.address ??
        'Unknown'
      }
City: ${
        selectedRestaurant.city ??
        'Unknown'
      }

IMPORTANT RULES:

1. Use the conversation history to understand what the user is referring to.

2. Remember the user's previous messages during this conversation.

3. If the user says things like "I already told you", "as I said", "previously", or "I mentioned it", check the conversation history before responding.

4. Never invent information that the user did not provide.

5. Never invent restaurants.

6. Never invent dishes.

7. Never invent prices.

8. Never invent ratings.

9. Never invent ingredients.

10. Never claim unavailable food is available.

11. Only recommend items from AVAILABLE MENU.

12. For vegetarian requests, only recommend items with Type: VEG.

13. For non-vegetarian requests, only recommend items with Type: NON_VEG.

14. If the user specifies a budget, only recommend items within that budget.

15. Always mention the actual current price.

16. If a discount price exists, use the discounted price.

17. For best sellers, use only items marked Best Seller: Yes.

18. For ratings, use the actual rating provided in the menu.

19. If a requested item does not exist in the menu, clearly say it is unavailable.

20. Do not tell the user to log in or select a restaurant because a restaurant has already been selected.

21. If the user asks for the menu, summarize only the actual available menu.

22. The chatbot cannot create, confirm, cancel, or modify table reservations.

23. If the user wants to book a table, explain the booking steps:
    - Select the restaurant.
    - Provide the date.
    - Provide the preferred time.
    - Provide the number of guests.
    - Optionally provide special requests.

24. The chatbot may collect and summarize booking details, but must never claim that a reservation has been created or confirmed.

25. Never invent booking availability, booking IDs, confirmation numbers, table numbers, or reservation status.

26. If the user provides booking details, summarize them clearly and tell the user that the actual reservation must be completed through the restaurant's booking system.

27. If booking details are missing, ask only for the missing details.

28. If the user asks whether the booking is confirmed, clearly explain that the chatbot cannot confirm reservations.

29. If the user asks for other restaurants, alternative restaurants, different restaurants, or nearby restaurants, only use restaurants from OTHER AVAILABLE RESTAURANTS.

30. Never invent a restaurant name.

31. Never invent a restaurant rating, cuisine, price range, address, city, availability, or any other restaurant information.

32. Only mention restaurant information explicitly provided in OTHER AVAILABLE RESTAURANTS.

33. If no other restaurants are provided, clearly say that no other restaurants are currently available.

34. When suggesting another restaurant, use its exact database name.

35. Never create fictional restaurant names such as Curry Corner, Sushi Express, Pasta Palace, Taco Town, or similar names unless they actually exist in the provided restaurant data.

36. Keep responses concise and friendly.

37. Use emojis naturally without overusing them.

AVAILABLE MENU:

${
  menuContext ||
  'No available menu items were found.'
}

OTHER AVAILABLE RESTAURANTS:

${
  otherRestaurantsContext ||
  'No other restaurants are currently available.'
}
`;

      /*
       * Keep only valid previous messages.
       */
      const cleanedHistory =
        history
          .filter(
            (item) =>
              item &&
              (item.role === 'user' ||
                item.role ===
                  'assistant') &&
              typeof item.content ===
                'string' &&
              item.content.trim(),
          )
          .slice(-10);

      /*
       * Send conversation history
       * together with the current message.
       */
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${apiKey}`,
          },

          body: JSON.stringify({
            model:
              'openai/gpt-oss-20b',

            messages: [
              {
                role: 'system',
                content:
                  systemPrompt,
              },

              ...cleanedHistory,

              {
                role: 'user',
                content:
                  userMessage,
              },
            ],

            temperature: 0.3,
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
          'AI service request failed',
        );
      }

      const data =
        await response.json();

      const aiMessage =
        data.choices?.[0]?.message
          ?.content;

      if (!aiMessage) {
        throw new InternalServerErrorException(
          'No response generated by AI',
        );
      }

      return {
        message: aiMessage,

        restaurant: {
          id: selectedRestaurant.id,
          name:
            selectedRestaurant.name,
          address:
            selectedRestaurant.address,
          city:
            selectedRestaurant.city,
        },
      };
    } catch (error) {
      if (
        error instanceof
        InternalServerErrorException
      ) {
        throw error;
      }

      if (
        error instanceof
        NotFoundException
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

  private isRestaurantListRequest(
    message: string,
  ): boolean {
    const patterns = [
      'show me list',
      'show list',
      'show restaurants',
      'show me restaurants',
      'restaurant list',
      'list restaurants',
      'list of restaurants',
      'list of all restaurants',
      'list all restaurants',
      'available restaurants',
      'what restaurants are available',
      'which restaurants are available',
      'find restaurants',
      'restaurants near me',
    ];

    return patterns.some(
      (pattern) =>
        message.includes(pattern),
    );
  }

  private isOtherRestaurantRequest(
    message: string,
  ): boolean {
    const patterns = [
      'other restaurants',
      'other restaurant',
      'another restaurant',
      'another restaurants',
      'different restaurant',
      'different restaurants',
      'suggest other',
      'suggest another',
      'suggest different',
      'show other restaurants',
      'show me other restaurants',
      'recommend other restaurants',
      'recommend another restaurant',
      'recommend different restaurants',
      'more restaurants',
      'more restaurant',
      'other options',
      'different options',
    ];

    return patterns.some(
      (pattern) =>
        message.includes(pattern),
    );
  }

  private async tryFindRestaurant(
    message: string,
  ) {
    try {
      const result =
        await this.restaurantsService.searchRestaurants(
          message,
          undefined,
          {
            limit: 10,
            offset: 0,
          },
        );

      return result;
    } catch (error) {
      console.error(
        'Restaurant search error:',
        error,
      );

      return null;
    }
  }
}