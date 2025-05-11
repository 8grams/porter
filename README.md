<p align="center">
    <img alt="Ravage" src="https://raw.githubusercontent.com/8grams/porter/refs/heads/develop/public/logo.png" height="200">
</p>


# Porter

A secure and modern resource management dashboard for handling various types of credentials and access management.

## Features

- 🔐 Secure credential management for multiple service types:
  - AWS IAM credentials
  - Google IAM credentials
  - VM SSH keys
  - Kubernetes configurations
  - PostgreSQL access credentials
  - MySQL access credentials
- 🔒 End-to-end encryption for sensitive data
- 🎨 Modern, responsive UI built with Astro and Tailwind CSS
- 🔄 Real-time updates and form validation
- 👥 User management and access control
- 🔍 Advanced filtering and search capabilities

## Tech Stack

- [Astro](https://astro.build/) - Modern static site builder
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Alpine.js](https://alpinejs.dev/) - Lightweight JavaScript framework
- SQLite - Database for storing encrypted credentials

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/porter.git
cd porter
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your configuration.

4. Start the development server:
```bash
pnpm run dev
```

The application will be available at `http://localhost:4321`.

## Usage

### Adding Resources

1. Click the "New Resource" button
2. Select the resource type (AWS IAM, Google IAM, VM, etc.)
3. Fill in the required credentials
4. Click "Save" to store the encrypted credentials

### Managing Resources

- View all resources in the dashboard
- Use filters to find specific resources
- Edit or delete existing resources
- Toggle password visibility when editing credentials

## Security

- All sensitive data is encrypted before storage
- Passwords and keys are never stored in plain text
- Secure session management

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.