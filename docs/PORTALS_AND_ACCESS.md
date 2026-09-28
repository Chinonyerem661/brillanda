# Brillanda Portals & Access Architecture

This document provides a comprehensive overview of Brillanda's user roles, access control mechanisms, portal workflows, and security rules.

---

## 1. Overview & User Roles

Brillanda serves four distinct user groups. All users access the platform through the **same main website and sign-in page**. Upon authenticating, users are automatically directed to their respective portal based on their role (`apps/web/src/portals/{role}`).

### User Roles & Portals Matrix

| Portal | Audience / Who | Primary Responsibilities & Key Capabilities |
| :--- | :--- | :--- |
| **School Admin** | Principal, Vice Principal, or School Office | Runs the term: configures classes and arms, assigns staff and students, monitors scoring progress, sends nudges, manages unlock requests, and publishes final results. |
| **Teacher** | Subject Teachers | Enters scores for assigned classes (tests & exams); real-time auto-calculation of totals/grades; marks classes complete when done. |
| **Parent** | Parents & Guardians | Views children's performance, subject breakdowns, grades, class position, and teacher remarks; downloads official report cards; receives notifications. |
| **Super Admin** | Brillanda Internal Team | Platform governance: provisions new schools from trial requests, oversees all registered institutions, monitors system health and usage metrics. |

---

## 2. Onboarding & Access Control

Brillanda enforces strict privacy and tenant isolation: **there is no public self-signup or "Create an Account" button.** Every account is created hierarchically by an authorized party above them.

### Account Provisioning Flow

```
[ Trial Request on Website ]
             │
             ▼
    ( Super Admin Team ) ──► Provisions School & Invites School Admin via Email
             │
             ▼
     ( School Admin ) ──┬──► Invites Teachers via Email
                        │
                        └──► Adds Students ──┬──► Invites Parents with Email via Email
                                              │
                                              └──► Generates Printed Access Slips for Parents without Email
```

1. **School Onboarding (Super Admin → School Admin)**
   - A school submits the **"Request a trial"** form on the Brillanda website.
   - The Brillanda internal team reviews the request, creates the school tenant, and sends an email invite to the primary School Admin.
2. **Teacher Invitation (School Admin → Teacher)**
   - The School Admin inputs the teacher's name and email address into the admin portal.
   - The system sends an email invitation to the teacher.
3. **Parent Onboarding (School Admin → Parent)**
   - **Email Invitations**: When the admin adds students (individually or via spreadsheet import), parents with email addresses automatically receive email invitations.
   - **Printed Access Slips**: Parents without email addresses receive a printed paper slip containing a unique access code to register and sign in.

### Security & Authentication Rules

- **Invitation Validity**: An invite link is valid for **3 days (72 hours)**. The recipient clicks the link, sets their password, and gains access. If a link expires, the user must request a new invite from their school.
- **One Email = One Account**: Each email address is unique across the entire platform and maps to a single user account.
- **Consistent Authentication Error Messages**: To prevent user enumeration attacks (strangers trying to guess valid user emails), any failed login attempt (whether from an invalid password or an unknown email) returns the exact same message:
  > *"That email and password don't match."*
- **Password Reset**: The "Forgot password" feature emails a secure, single-use reset link to verified accounts.

---

## 3. What Each Portal Does

### 🏫 School Admin Portal (`apps/web/src/portals/admin`)
- **Term Progress Dashboard**: Tracks overall term completion, subject entry status across all arms, and identifies lagging entries.
- **Teacher Nudges & Reopen Requests**: Sends reminders to teachers who are behind schedule; reviews and approves/rejects teacher requests to reopen finished classes.
- **Result Publishing**: Formally publishes class results when all constituent subjects are complete. Publishing locks scores and triggers automated notification emails to parents.
- **Academic & Operational Setup**: Configures academic sessions, term dates, grading scales, assessment weights (CA1, CA2, Exam), arms/classes, staff accounts, and student enrollments.

### 👩‍🏫 Teacher Portal (`apps/web/src/portals/teacher`)
- **Class Scoping**: Restricts view exclusively to the teacher's assigned subjects and classes/arms.
- **Score Entry**: Provides simple grid input for scores (e.g., First Test, Second Test, Exam). Subtotals, overall totals, and letter grades calculate instantly as typing occurs, backed by automatic saving.
- **Completion Locking**: The teacher clicks **"Mark complete"** upon finishing score entry. Modifying scores after this requires submitting a reopen request to the School Admin.

### 👨‍👩‍👧 Parent Portal (`apps/web/src/portals/parent`)
- **Multi-Child Navigation**: Allows parents with multiple children to seamlessly switch between student profiles.
- **Performance Overview**: Displays child's class average, class/arm rank, detailed subject score breakdown, and teacher remarks.
- **Report Card Viewer & Downloader**: Provides instant access to view or download digital report cards.
- **Real-Time Result Notifications**: Automatically notifies parents via email the moment new results are published by the school admin.

---

## 4. Is There a Super Admin Portal?

**Yes, absolutely.** 

- **Codebase Location**: `apps/web/src/portals/super-admin`
- **User Base**: The internal Brillanda team ("Us").
- **Key Functions**:
  - Processing incoming **Trial Requests** submitted via the public website (`POST /api/v1/trial-requests`).
  - Provisioning new school tenants and creating initial School Admin accounts.
  - Platform-wide oversight, tenant management, subscription/status controls (e.g., suspending or activating schools), and cross-school analytics.
