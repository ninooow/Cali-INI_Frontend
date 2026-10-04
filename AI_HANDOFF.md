\# AI\_HANDOFF.md — Cali-INI Frontend



\## Purpose



This folder contains the \*\*Vue frontend\*\* for Cali-INI.



Architecture:



```text

Cali-INI/

├── calini/      # FastAPI + PostgreSQL backend

└── frontend/    # Vue frontend

```



Frontend communicates with backend \*\*only through REST API\*\*.



Do not access PostgreSQL directly.  

Do not import, execute, or reproduce `intelligence\_engine.py`.



\---



\## Source of Truth



Before implementing a feature, use these documents:



1\. \*\*04\_Cali\_INI\_Design\_System\_and\_Logo\*\*

&#x20;  - Visual identity

&#x20;  - Colors

&#x20;  - typography

&#x20;  - component/status styling

&#x20;  - logo usage



2\. \*\*05\_MenuInput\_Guide\*\*

&#x20;  - Navigation

&#x20;  - forms

&#x20;  - user workflows

&#x20;  - Operations, Reliability, Asset Management, Administration



3\. \*\*06\_Cali\_INI\_Dashboard\_UI\_Specification\*\*

&#x20;  - Dashboard hierarchy

&#x20;  - cards

&#x20;  - tables

&#x20;  - charts

&#x20;  - information layout



4\. \*\*07\_FRONTEND\_BACKEND\_CONTRACT.md\*\*

&#x20;  - \*\*Authoritative API contract\*\*

&#x20;  - implemented endpoints

&#x20;  - request/response schemas

&#x20;  - filters

&#x20;  - frontend/backend boundaries



If documents conflict about API availability, \*\*07 wins\*\*.



\---



\## Backend Status



Backend is operational with:



\- FastAPI

\- PostgreSQL

\- SQLAlchemy

\- Alembic

\- database seeding

\- engine persistence

\- Assets API

\- Hourly Telemetry API

\- Incident / RCA / CAPA API

\- Problem Workflow API

\- Users API

\- Analytics Read API

\- Sensor Tags API

\- Equipment Limits API

\- Dashboard Read API



Q1–Q3 frontend-readiness endpoints have passed PostgreSQL smoke testing.



Do \*\*not\*\* run the intelligence engine while developing frontend.



\---



\## Frontend Rules



\### API



Never invent an endpoint.



Use only endpoints documented as implemented in `07\_FRONTEND\_BACKEND\_CONTRACT.md`.



Keep API access in a dedicated frontend API/service layer.



Do not embed backend URLs throughout Vue components.



\### Analytics



Engine-generated values are \*\*read-only\*\* in the frontend.



Do not calculate or recreate:



\- condition inference

\- health index

\- anomaly score

\- RCA similarity

\- forecast models

\- forecast confidence bounds

\- weekly engineering aggregation



\### Unsupported KPIs



Some dashboard aggregate KPIs are not currently provided by backend.



Examples include:



\- Plant Health Score aggregate

\- Operating Performance Index

\- Reliability \& Consequence Index

\- Normalized Load / Production Index

\- Emission Intensity Proxy



Keep their UI slots when required by the Dashboard specification, but display a clear unavailable state such as:



`N/A`



or



`Not Available`



Never invent formulas or placeholder production values.



\### Weekly Data



Weekly measurements are backend/system-derived.



Do not create weekly aggregation logic in Vue.



\---



\## Implementation Priority



Build incrementally:



1\. Vue project foundation

2\. routing + application shell

3\. API client/service layer

4\. shared design-system components

5\. Dashboard

6\. Operations / Data Input

7\. Problem Verification / Workspace

8\. Reliability / Incident / RCA / CAPA

9\. Asset Management

10\. Administration



Connect pages to real backend APIs as they are implemented.



Avoid large speculative abstractions before they are needed.



\---



\## UI Principle



Dashboard answers:



\*\*WHAT is happening?\*\*



Problem / Asset views answer:



\*\*WHY is it happening?\*\*



Technical details answer:



\*\*HOW was it determined?\*\*



Follow the provided Cali-INI design system rather than introducing a new visual language.



\---



\## Agent Safety Rules



Before changing code:



1\. Read the relevant specification.

2\. Check `07\_FRONTEND\_BACKEND\_CONTRACT.md` before using an API.

3\. Modify only files required for the current task.

4\. Do not modify backend code from the frontend task.

5\. Do not modify `intelligence\_engine.py`.

6\. Do not invent API responses, enums, formulas, or database fields.

7\. Do not run expensive backend/engine tests unless explicitly requested.

8\. Keep changes small and checkpointed.



When uncertain whether backend supports something, treat it as \*\*unsupported until confirmed by `07\_FRONTEND\_BACKEND\_CONTRACT.md`\*\*.



\---



\## Current Goal



Build the frontend against the \*\*existing working backend first\*\*.



Do not delay frontend implementation to redesign backend architecture or implement speculative KPIs.



Backend gaps discovered during real frontend integration should be documented and addressed separately.

