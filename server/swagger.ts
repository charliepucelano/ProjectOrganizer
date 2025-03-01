import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Move-in Management API',
    version: '1.0.0',
    description: 'API documentation for the Move-in Management application',
  },
  servers: [
    {
      url: '/api',
      description: 'Development server',
    },
  ],
  components: {
    schemas: {
      Todo: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          category: { type: 'string' },
          completed: { type: 'integer', enum: [0, 1] },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          priority: { type: 'integer', enum: [0, 1] },
          hasAssociatedExpense: { type: 'integer', enum: [0, 1] },
          estimatedAmount: { type: 'number', nullable: true },
        },
      },
      Expense: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          description: { type: 'string' },
          amount: { type: 'number' },
          category: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          todoId: { type: 'integer', nullable: true },
          isBudget: { type: 'integer', enum: [0, 1] },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      LoginCredentials: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string', format: 'password' },
        },
      },
    },
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
      },
    },
  },
  security: [
    {
      cookieAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./server/routes.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJSDoc(options);
