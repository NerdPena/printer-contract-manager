
# Printer Lease Management Web App

## Overview
A modern, colorful dashboard for managing printer lease contracts, clients, monthly counters, and generating branded PDF reports.

## Authentication
- Email & password login via Lovable Cloud
- User profiles with admin role support

## Database Structure

### Clients Table
- Name, phone, email, business name, address, notes

### Printers Table
- Model/type, serial number, linked client
- Initial counter (B&W and color) at contract start

### Contracts/Subscriptions Table
- Linked client + printer
- Subscription type/name, monthly price
- Included B&W pages per month, included color pages per month
- Price per extra B&W page, price per extra color page
- Contract start date, end date, status (active/expired/cancelled)

### Monthly Counters Table
- Linked printer, month/year
- Total B&W counter reading, total color counter reading
- Calculated: pages printed that month (current counter minus previous counter)
- Source (manual entry or email import)

### Monthly Reports Table
- Linked client, month/year
- Subscription cost, included pages, exceeded pages, excess cost, total due
- Generated PDF URL

## Pages & Features

### Dashboard (Home)
- Overview cards: total clients, active contracts, printers, alerts
- Recent activity feed
- Quick stats with colorful charts (monthly revenue, page usage trends)

### Clients Page
- List all clients with search/filter
- Client detail view: contact info, assigned printers, active contracts, payment history
- Add/edit client form

### Printers Page
- List all printers with status indicators
- Printer detail: model, S/N, current client, counter history graph
- Add/edit printer form

### Contracts Page
- List all active/expired contracts
- Contract detail: subscription terms, linked client & printer, pricing breakdown
- Create/edit contract form linking client + printer + subscription terms

### Counters Page
- Monthly counter entries per printer
- Manual entry form (for when email import isn't used)
- Email import: parse incoming counter emails (plain text format) — user will provide sample format later, initial setup with manual entry + a text paste parser
- Counter history table with month-over-month comparison

### Reports Page
- Generate monthly report per client
- Report shows: subscription details, page counts (B&W + color), included vs exceeded pages, cost breakdown
- Branded PDF download with company logo, colors, and professional layout
- Batch generate reports for all clients for a given month

### Settings Page
- Company branding (logo, name, contact info for reports)
- Subscription plan templates (reusable pricing tiers)
- Email parser configuration (for counter import format)

## Design
- Modern & colorful UI with vibrant accent colors
- Card-based layout with data visualization (charts for usage trends)
- Responsive design for desktop and tablet use
- Color-coded status indicators (active contracts = green, expiring = amber, expired = red)

## PDF Reports
- Branded header with company logo and contact info
- Client details section
- Table: printer(s), subscription type, included pages, actual pages, exceeded pages, per-page cost, line total
- Summary with total amount due
- Professional styling matching the app's brand colors
