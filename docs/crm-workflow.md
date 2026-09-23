# Wild Ones CRM Workflow — integration design

## Design principle
Wild Ones should not become a separate CRM silo. Extend the existing Koa’s Events CRM model and shared sales record with a brand discriminator (`brand = wild-ones`) and a production project type (`projectType = large-format-production`). This preserves the current Koa’s CRM strengths: project records, contacts, tasks, appointments, workflows, templates, client links, activity history, proposal/booking/payment context, staff ownership and branded email.

## Primary stage model
Use the same top-level stages already present in the Koa’s Events CRM:

1. `inquiry`
2. `lead`
3. `proposal`
4. `booked`
5. `lost`

Add Wild Ones-specific `projectStatus` values beneath those stages:

- Inquiry: New inquiry; Needs review; Contacted; Awaiting details
- Lead: Qualified; Tour requested; Tour scheduled; Production review
- Proposal: Drafting; Sent; Revision; Accepted
- Booked: Contract pending; Deposit pending; Secured; Production planning; Final walkthrough; Show ready; Completed
- Lost: Declined; Date unavailable; Budget mismatch; No response; Client cancelled

## Submission-to-CRM flow
1. Netlify form receives the public inquiry.
2. Server-side intake validates spam/security and normalizes fields.
3. Create or update a shared sales record and CRM project.
4. Set `brand=wild-ones`, `projectType=large-format-production`, `stage=inquiry`, `projectStatus=New inquiry`.
5. Recalculate qualification score on the server; never trust the browser score as authoritative.
6. Calculate production complexity separately from qualification.
7. Create the first workflow enrollment and follow-up tasks.
8. Send the organizer a branded acknowledgement email.
9. Route the project into the Wild Ones filtered CRM view.

## Qualification score (0–100)
Recommended dimensions:

- Target event fit: 0–15
- Attendance fit: 0–15
- Budget readiness: 0–20
- Planning readiness: 0–15
- Production detail completeness: 0–15
- Organizer track record / professional profile: 0–10
- Date flexibility: 0–5
- Decision timing: 0–5

Suggested routing:

- 80–100: Priority qualified lead
- 60–79: Qualified lead
- 40–59: Manual review / nurture
- Under 40: Nurture or decline depending on fit

Do not mix safety risk into qualification. Track technical complexity and safety review as separate flags.

## Production complexity indicator
`standard`, `moderate`, or `high` based on attendance, generator/concert power, large vehicles, special effects, vendor count, multi-day use, complex parking/shuttle plans and outside production scope.

High-complexity projects should automatically require a site tour / production review before final proposal.

## Wild Ones project record fields

### Event basics
- eventType
- eventConcept
- preferredDate / backupDate
- dateFlexibility
- startTime / endTime
- expectedAttendance
- eventAccess

### Production
- stagePlan
- audioPlan
- lightingPlan
- powerProfile
- fohRequirements
- largestProductionVehicle
- specialElements[]
- productionRiderUrl

### Operations
- vendorCount
- eventStaffCount
- artistCount
- productionCrewCount
- beverageService
- securityPlan
- parkingPlan
- insuranceReadiness
- loadInTime
- loadOutTime
- overnightUse
- operationsNotes

### Commercial / qualification
- eventBudget
- planningStage
- organizerExperience
- decisionTiming
- qualificationScore
- qualificationBand
- productionComplexity
- projectOwner
- leadSource / UTM fields

### Milestone status
- siteTourStatus: not_required | requested | scheduled | completed | waived
- proposalStatus: not_started | drafting | sent | revision | accepted | declined | expired
- contractStatus: not_started | drafting | sent | executed | void
- depositStatus: not_due | due | partial | paid | overdue | refunded

## Automatic tasks by lifecycle

### New inquiry
- Review inquiry within one business day
- Check date / known conflicts
- Review qualification + complexity
- Request missing details if needed

### Qualified lead
- Contact organizer
- Decide whether site tour is required
- Request rider / site-plan inputs

### Tour scheduled
- Prepare event-specific site-map notes
- Confirm largest vehicle / load-in needs
- Prepare measurement questions
- Record tour notes immediately after walkthrough

### Proposal
- Draft venue scope
- Add production / operational conditions
- Send proposal
- Follow up at 2 days and 7 days

### Accepted proposal
- Generate contract
- Track signature
- Issue deposit request
- Mark event secured only when required agreement and payment conditions are met

## Event production timeline
Default booked-event workflow, adjusted by event date:

- T-120 to T-90: production kickoff; preliminary site plan; primary vendors
- T-75: preliminary power / stage / audio / lighting plan
- T-60: vendor roster; insurance / compliance collection
- T-45: guest-flow, parking, security, bar and vendor plan
- T-30: production plan v1 locked; staffing estimate; ticketing / entry plan
- T-21: rider and special-effects review; change-control begins
- T-14: final operating schedule; load-in / load-out sequence
- T-7: final walkthrough; emergency-access verification; final guest estimate
- T-3: staff / vendor confirmation; weather plan; contact sheet
- T-1: load-in authorization and site readiness
- Event day: show-day checklist and incident log
- T+1: load-out / property closeout
- T+3 to T+7: financial close, damages / adjustments, internal debrief, review request where appropriate

## CRM UI
Mirror the Koa’s Events Business CRM rather than inventing a separate admin pattern. Add:

- Brand filter: Koa’s Events | Koa’s Mobile Bar | Wild Ones
- Project-type filter
- Qualification score / band filter
- Production complexity filter
- Dedicated Wild Ones status cards
- Production Requirements tab
- Site Tour panel
- Proposal / Contract / Deposit status strip
- Event Production Timeline panel
- Site-map attachment / version history
- Rider and technical-document attachments
- Vendor compliance summary
- Internal notes, tasks, appointments, workflows and activity history already consistent with the Koa’s CRM model

## Implementation note
The current static website prototype includes client-side score preview only for UX. The production implementation should recompute the score and complexity server-side before saving them to the CRM.
