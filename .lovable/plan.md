
# Job Consultancy CRM - Implementation Plan

## Overview
A full-featured CRM system for job consultancy with role-based access (Admin, Manager, Member), built with React frontend and Supabase backend (PostgreSQL + Auth + Edge Functions).

---

## 1. Authentication & Role-Based Access
- **Three separate login pages** for Admin, Manager, and Member roles
- 6-digit numeric password authentication via Supabase Auth
- Role-based access control using a dedicated `user_roles` table (not on profiles) to prevent privilege escalation
- **Forgot Password flow** on each login page with email-based reset links (24-hour expiry)
- `/reset-password` page for setting a new 6-digit numeric password
- Auto-redirect to the appropriate dashboard after login based on role

## 2. Database Schema (Supabase/PostgreSQL)
- **profiles** – user profile info (name, email, phone)
- **user_roles** – separate role table (admin, manager, member) with security definer function for RLS
- **projects** – dynamic project management (name, description, status) — Admin can create/edit/delete
- **leads** – Lead ID, customer name, place, mobile, review, lead_by, project assignment
- **sales** – linked to leads, follow-up tracking (follow_up_1, follow_up_2), project assignment
- **call_logs** – call date, time, duration, project, status (completed/dropped), associated lead, caller info
- **call_lists** – uploaded daily call data (S.No, Name, Number) linked to sales dashboard
- **finance** – company name, date, total amount, share amount, paid status (Paid/Processing/On Practically), project assignment
- Row-Level Security on all tables enforcing role-based access

## 3. Admin Dashboard
- Full system overview with summary cards (total leads, sales, calls, revenue)
- User management: create, edit, delete Admin/Manager/Member accounts
- Project management: create, rename, archive projects dynamically
- Full CRUD access across all modules
- Profit visibility and financial analytics (exclusive to Admin)
- Access to all call records and Excel export functionality

## 4. Leads Dashboard
- Table view: S.No, Lead ID, Customer Name, Place, Mobile Number, Review, Lead By
- **Project dropdown filter** to show leads for a specific project
- Search and filter capabilities
- Admin: full CRUD including delete
- Manager: manage their team's leads (no delete)
- Member: enter/edit data for their assigned leads only (no delete)

## 5. Sales Dashboard
- Table view: S.No, Lead ID, Customer Name, Follow Up 1, Follow Up 2, Call Button
- **Project dropdown filter** for project-specific sales records
- **Click-to-call link** (tel:) on phone numbers — opens device dialer
- **"Add Call List" button** to upload Excel files (S.No, Name, Number columns) — uploaded data appears in the dashboard
- Phone numbers from uploaded call lists are clickable tel: links
- Call log entry form after initiating a call (manual metadata entry: date, time, duration, status)
- Manager: oversee team's sales activities
- Member: view and manage only their assigned sales records

## 6. Finance Dashboard
- Table view: S.No, Company Name, Date, Total Amount, Share Amount, Paid Status
- **Paid Status** as a button selector with three states: "Paid", "Processing", "On Practically"
- **Project dropdown filter** for project-specific finance records
- Admin only: create and delete finance records
- All roles can view the dashboard

## 7. Call Tracking & Excel Management
- Centralized call log storage in the database
- **Excel export** functionality for call data download
- Admin: full view/edit of all call records + export
- Manager: view/edit call records for their team
- Member: view only their assigned call records
- Edge function for Excel file generation using server-side processing

## 8. Finance Analytics Dashboard
- Summary metric cards displaying:
  - Overall Calls, Project 1-4 Calls, Drop Calls
  - Weekly Calls, Monthly Calls, Today's Total Calls
  - Total Amount, Total Share Amount
  - **Profit** (visible to Admin only)
- Real-time calculations from call logs and finance data
- Dynamic filtering by project and time period (daily/weekly/monthly)
- Charts and graphs using Recharts for visual analytics

## 9. Navigation & Layout
- Sidebar navigation with role-conditional menu items
- Dashboard switcher: Home, Leads, Sales, Finance, Call Tracking, Analytics
- Responsive design for desktop and tablet use
- Role indicator in the header showing current user and role

## 10. Implementation Phases
Since building everything at once, the build order will be:
1. Supabase setup (tables, RLS, auth, roles)
2. Auth pages (3 login pages + forgot/reset password)
3. Layout shell with sidebar navigation
4. Admin dashboard with user & project management
5. Leads dashboard with CRUD and filtering
6. Sales dashboard with call list upload and tel: links
7. Finance dashboard with paid status controls
8. Call tracking with Excel export
9. Analytics dashboard with charts and metrics
