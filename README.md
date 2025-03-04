# ProjectOrganizer

## Overview

ProjectOrganizer is a full-stack web application designed to help users efficiently manage and organize projects with a focus on budget tracking, task management, and collaborative note-sharing. Perfect for personal or professional projects, this tool streamlines project planning while providing intelligent research capabilities through Perplexity API integration.

## Features

ProjectOrganizer offers a practical suite of project management capabilities:

### Intuitive Project Dashboard

The central dashboard provides a visual overview of all your projects at a glance. Each project displays key metrics including progress status, upcoming deadlines, and budget information. The clean, responsive interface ensures critical information is immediately accessible whether you're working from a desktop or mobile device.

### Task Management System

Create, track, and complete tasks with powerful organizational tools. Tasks can be configured with or without due dates, budget requirements, and other custom parameters. The streamlined interface makes managing work items effortless, while the notification system ensures nothing falls through the cracks.

### Budget Forecasting and Expense Tracking

Take control of your project finances with built-in budget management tools. ProjectOrganizer allows you to forecast budget needs for the entire project and track expenses as they occur. Easily distinguish between planned expenses and actual costs, helping you stay on budget throughout the project lifecycle.

### Collaborative Notes

Share ideas, requirements, and research within the project team through the integrated Notes system. Team members can contribute thoughts on potential tasks, document important information, or simply brainstorm next steps. Notes provide a centralized location for project-related communication that might not fit neatly into task descriptions.

### Perplexity API Integration

Leverage artificial intelligence to research project-related questions directly within the application. The innovative "research note" functionality connects to Perplexity's API, allowing you to ask complex questions based on your notes and receive comprehensive answers. For example, when planning a move, you could write a note about your current and future locations, then use the research feature to generate a list of suitable moving companies.

### Google Calendar Integration

Never miss a deadline with seamless Google Calendar synchronization. Tasks with due dates are automatically added to your Google Calendar, ensuring all project deadlines appear alongside your other appointments and commitments. Updates to task deadlines within ProjectOrganizer automatically reflect in your calendar.

## Technology Stack

ProjectOrganizer leverages cutting-edge technologies to deliver a smooth, responsive user experience:

- **Frontend**: TypeScript with a modern component framework
- **Styling**: Tailwind CSS for flexible, responsive design
- **Build Tools**: Vite for lightning-fast builds and development
- **Database ORM**: Drizzle for type-safe database operations
- **External APIs**: Perplexity API for research capabilities, Google Calendar API for task synchronization
- **Development Environment**: Configuration supports both local development and Replit cloud environment

## Installation

### Prerequisites

- Node.js (v16.0 or higher)
- npm or yarn package manager
- Database (compatible with Drizzle ORM)
- Google Cloud Platform account (for Calendar API)
- Perplexity API key

### Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/charliepucelano/ProjectOrganizer.git
   cd ProjectOrganizer
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   
   Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL=your_database_connection_string
   JWT_SECRET=your_secret_key
   PORT=3000
   PERPLEXITY_API_KEY=your_perplexity_api_key
   GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_OAUTH_CLIENT_SECRET=your_google_oauth_client_secret
   ```

4. Initialize the database:
   ```
   npm run db:migrate
   ```

5. Start the development server:
   ```
   npm run dev
   ```

## Project Structure

The project follows a modular architecture with clear separation of concerns:

```
ProjectOrganizer/
├── attached_assets/   # Static resources and media files
├── client/            # Frontend application code
├── server/            # Backend API and server logic
├── shared/            # Code shared between client and server
├── vite.config.ts     # Vite configuration
├── tailwind.config.ts # Tailwind CSS configuration
├── drizzle.config.ts  # Database ORM configuration
└── ...
```

### Key Directories

- **client**: Contains the user interface components, state management, and frontend logic.
- **server**: Houses the API endpoints, middleware, database models, and business logic.
- **shared**: Includes type definitions, utility functions, and constants used by both client and server.
- **attached_assets**: Stores images, icons, and other static resources used throughout the application.

## Use Case Example: Apartment Move

ProjectOrganizer is perfect for managing personal projects like moving to a new apartment:

1. Create a new project "Apartment Move"
2. Add tasks with budget needs:
   - "Hire movers" - $500 budget
   - "Pack kitchen" - No budget required
   - "Transfer utilities" - $150 budget for connection fees
   
3. Create research notes:
   - "I need to find a moving company that services routes from Brooklyn to Manhattan with good reviews and availability next month"
   - Use the research feature to get Perplexity-powered recommendations

4. Track expenses as they occur, comparing actual costs to your forecasted budget

5. All tasks with due dates automatically appear in your Google Calendar

## Development Workflow

### Running in Development Mode

```
npm run dev
```

This command starts both the client and server in development mode with hot reloading enabled.

### Building for Production

```
npm run build
```

Generates optimized production builds for both client and server components.

### Deploying

The application can be deployed to various platforms including Vercel, Netlify, or traditional hosting environments:

```
npm run deploy
```

## Contributing

Contributions to ProjectOrganizer are welcome! Please follow these steps to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the project's coding standards and includes appropriate tests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Charlie Pucelano - [GitHub Profile](https://github.com/charliepucelano)

Project Link: [https://github.com/charliepucelano/ProjectOrganizer](https://github.com/charliepucelano/ProjectOrganizer)

---

