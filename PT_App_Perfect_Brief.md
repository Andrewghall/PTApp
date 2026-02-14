# PT Business and Workout App – Product Brief

## 1. Purpose
Build a single app that lets a personal trainer run a small group PT business and lets each client book, pay, track workouts, and see progress.

Operating model:
- One PT runs 1 to 1 attention within a fixed group of 6, rotating around all six in the session.
- Each PT session is £25.
- Clients can buy session packs as credits.
- PT can award free credits for referrals.
- PT manages schedules, clients, programmes, and business performance in one admin area.

## 2. Users and Roles
### Client
- Login, profile, membership, credits
- Book and manage sessions
- Build and follow training regime
- Log sets and weights
- View history and progress analytics

### PT Admin
- Create schedules and available slots
- Manage clients and their credits
- Create and assign regimes
- Award free credits and referral rewards
- Configure pricing and discounts
- View utilisation and revenue reporting

## 3. Core Product Goals
- Fast booking and payments.
- Zero ambiguity on credits, attendance, and cancellations.
- Workout logging as fast as FitNotes style tools.
- Simple progression analytics for a small set of exercises.
- Admin controls that do not require technical support.

## 4. Key Concepts
### Credits
- 1 credit = 1 PT session = £25.
- Clients can purchase packs.
- PT can add complimentary credits.
- Credits are consumed when a session is attended, or per policy at booking time.

### Pricing and Discounts
- PT configures packs and discounts in admin.
- Example:
  - 5 credits at standard price
  - 10 credits with 10% discount (configurable)
- PT can run promotions without code changes.

### Referral Rewards
- PT can create a referral programme:
  - Award X free credits to referrer (and optionally to the new client)
  - Track referral source and reward status
- Minimum requirement: manual admin award with referral note.
- Nice to have: referral link or code per client.

### Group of Six Session
- Each session can have up to 6 booked clients.
- PT controls capacity per slot.
- Client sees remaining spaces before booking.

## 5. Client Experience, Required Screens and Flows

### 5.1 Onboarding
Screens:
- Sign up, login
- Profile setup (name, contact, goals, injury notes optional)
- Credits status and buy credits prompt
Flow:
- Login → dashboard → buy credits if none → book

### 5.2 Client Dashboard
Must show:
- Next booked session
- Credits remaining
- Quick actions: Book, Cancel, Start workout log, View progress

### 5.3 Booking
Screens:
- Weekly calendar view of available PT slots
- Slot detail: time, location, capacity, credits required, cancellation policy
Flow:
- Browse calendar → select slot → confirm booking → credit hold or credit deduct

Rules:
- Cannot book without enough credits unless PT allows pay later.
- Waitlist optional, not required for v1.

### 5.4 Cancel or Cannot Attend
Screens:
- My bookings list
- Booking detail with cancel action and reason
Behaviour:
- Client marks cannot attend.
- App records status and triggers credit policy:
  - Option A: credit refunded if within policy window
  - Option B: credit forfeited if late cancel
Admin must configure policy in settings.

### 5.5 Training Regime
Objective: make regimes simple and repeatable.
Screens:
- My programme
- Programme day template
- Exercise detail

Programme model:
- Small set of core exercises (5 to 7) agreed with PT.
- Each exercise has prescribed sets, reps, and progression notes.

PT actions:
- Create template regimes
- Assign to clients
- Adjust per client

Client actions:
- View regime
- Log actual performance against regime

### 5.6 Workout Logging
Reference: FitNotes behaviour, fast, low friction.
Screens:
- Today’s workout
- Exercise logging screen
- Exercise picker

Logging requirements:
- Add exercise in 1 tap.
- Log a set with weight and reps with minimal taps.
- Show list of logged sets under each exercise.
- Copy previous workout to new date.
- Works offline and syncs later (nice to have, v2).

### 5.7 History and Progress Analytics
Screens:
- Exercise history
- Graphs: estimated 1RM, max weight, volume, reps (like the reference screenshots)
- Personal records view

Analytics requirements:
- Support common patterns:
  - 5x5 sessions
  - Top set or single heavy rep day
- Show trend lines and recent bests.
- Filters: 1m, 3m, 6m, 1y, all.

## 6. PT Admin Experience, Required Screens and Flows

### 6.1 Admin Dashboard
Must show:
- Upcoming sessions and attendance
- Spaces remaining per slot
- Revenue and credits sold (basic)
- Alerts: low credits, frequent cancellations

### 6.2 Scheduling
Screens:
- Create recurring weekly slots
- Edit slot capacity (default 6)
- Mark holidays or unavailable dates
- View bookings per slot

### 6.3 Client Management
Screens:
- Client list, profile, credits, attendance history
Actions:
- Add or remove credits
- Award referral credits
- Assign or edit programme
- Notes per client

### 6.4 Pricing and Promotions
Screens:
- Credit pack management
Fields:
- Pack size (credits)
- Price
- Discount percent
- Active flag
Goal: PT can change pricing without developer support.

### 6.5 Payments
Requirement:
- In app checkout for credit packs
- Receipts and transaction history
- Refunds handled manually via admin notes for v1

## 7. Data Model, Minimum Entities
- User (client, admin)
- ClientProfile
- CreditBalance, CreditTransaction (purchase, consume, refund, comp, referral)
- Slot (date time, capacity, status)
- Booking (slot, user, status: booked, attended, no show, cancelled)
- Programme (template)
- ProgrammeAssignment (programme to client)
- Exercise (master list)
- Workout (date, client)
- WorkoutExercise (exercise in workout)
- SetEntry (weight, reps, timestamp, notes optional)
- Referral (referrer, referred, status, reward transaction)

## 8. Policies and Rules to Define
- Credit consumption timing: at booking vs after attendance.
- Cancellation window and refund policy.
- No show handling.
- Slot capacity and booking cutoff.
- Referral eligibility rules.

## 9. Non Functional Requirements
- Mobile first UI.
- Very low friction workout entry.
- Secure auth and per user data isolation.
- Basic audit trail for credits.
- GDPR appropriate data handling.

## 10. MVP Scope
Include:
- Auth and profiles
- Credits purchase and balance
- Booking calendar and booking management
- Cannot attend and cancellation tracking
- Programme templates and assignments
- Workout logging and history
- Basic analytics graphs per exercise
- Admin scheduling, client management, pricing management, credits adjustments

Exclude for MVP:
- Automated referral codes and deep links
- Waitlists
- Advanced coaching chat
- Nutrition planning
- Wearable integrations

## 11. Success Metrics
- Time to book a slot under 30 seconds.
- Time to log a set under 3 seconds on average.
- Reduction in missed sessions due to easy cancel and reminders.
- High weekly retention of logging behaviour.
- PT can change pricing and packs without developer input.
