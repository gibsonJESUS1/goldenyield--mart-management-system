# Golden Yield Mart Management System

A full-stack shop management system built for real-world store operations.

## Overview

This project is designed to manage daily shop activities in a shared retail environment. It supports product management, inventory monitoring, sales recording, debt tracking, restocking, and operational reporting.

It was built as a practical business system, not just a demo project.

## Features

- Product management
- Category management
- Inventory tracking
- Restock history
- Sales management
- Best-fit pricing logic
- Debt tracking
- Debt payments and adjustments
- Dashboard summary
- Reports with date filters
- Responsive mobile-friendly UI

## Tech Stack

- Next.js (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL (Neon)
- Zustand
- Tailwind CSS

## Project Goals

- Build a production-ready shop management system  
- Support real business workflows  
- Keep the codebase clean and scalable  
- Deliver a responsive interface for desktop and mobile use  

## Getting Started

### 1. Install dependencies


```bash
npm install
## Getting Started

### 1. Install dependencies
```bash
npm install
2. Create a .env file and add your database connection
DATABASE_URL=your_database_url
3. Generate Prisma Client
npx prisma generate
4. Run migrations
npx prisma migrate dev
5. Start development server
npm run dev
Production Build
npm run build
npm run start
Status

The application is working locally and is being prepared for production deployment.

Author

Tosin Owolabi
