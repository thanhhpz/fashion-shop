# 👕 Fashion Shop - E-commerce Platform

A full-stack e-commerce platform for fashion products built with NestJS and Next.js.

## 📋 Table of Contents

- [Overview](#-overview)
- [Technology Stack](#-technology-stack)
- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Setup & Installation](#-setup--installation)
- [API Documentation](#-api-documentation)
- [Admin Panel](#-admin-panel)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Overview

**Fashion Shop** is a complete e-commerce solution designed for fashion retail businesses. It includes both customer-facing and admin interfaces with a robust backend API.

### Key Highlights:
- 🛡️ **Role-based Access Control**: 4 user roles (Admin, Manager, Staff, Customer)
- 🛍️ **Product Management**: Full CRUD with variants (size, color), images, categories
- 📦 **Order Management**: Complete order lifecycle with status tracking
- 🎨 **Modern UI**: Clean, professional design with Tailwind CSS
- 🔍 **Advanced Search**: Soundex, TF-IDF, Levenshtein algorithms

## 🛠️ Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **NestJS** | Backend framework |
| **Prisma** | ORM & Database management |
| **PostgreSQL** | Relational database |
| **JWT** | Authentication & Authorization |
| **Multer** | File upload (images) |
| **Bcrypt** | Password hashing |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework |
| **React** | UI library |
| **Tailwind CSS** | Styling |
| **Lucide Icons** | Icon library |
| **Axios** | HTTP client |

## ✨ Features

### 🔐 Authentication & Authorization
- Login/Logout with JWT
- 4 role system: Admin, Manager, Staff, Customer
- Protected routes
- Password change

### 🛍️ Product Management
- CRUD operations
- Product variants (size, color)
- Image upload with preview
- Color grouping for product images
- Main image selection
- Filter by category, price, brand
- Sort by price, latest, popular
- Pagination

### 📂 Category Management
- 3-level hierarchical categories
- Tree view with expand/collapse
- Slug auto-generation

### 🏷️ Brand Management
- CRUD operations
- Logo upload (file or URL)

### 📦 Order Management
- Full order lifecycle
- Status tracking
- Order history
- Customer information

### 🛒 Cart & Wishlist
- Add/remove items
- Merge guest cart to user cart
- Wishlist management

### 🔍 Search Engine
- Advanced search algorithms:
  - Soundex (phonetic search)
  - TF-IDF (text relevance)
  - Levenshtein (fuzzy matching)
  - Vietnamese language processing

### 🖥️ Admin Dashboard
- Real-time statistics
- Revenue tracking
- Order monitoring
- Low stock alerts
- Best-selling products
- New customers

## 🏗️ System Architecture
