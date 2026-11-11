# Architecture

This note describes the testing build. It is not a statement that the system is HIA or PIPA compliant.

```mermaid
flowchart LR
  subgraph browser [Browser on naturalbloom.ca]
    Site[Public site]
    Client[Client portal /portal/]
    Staff[Staff portal /staff/]
  end
  subgraph canada [Supabase ca-central-1]
    Auth[Supabase Auth]
    DB[(Postgres + RLS)]
    Store[Private storage bucket]
    Edge[Edge Functions]
  end
  Jane[Jane clinical record]
  Mail[Email provider when configured]
  Fax[Documo when configured]

  Site -->|person icon| Client
  Client --> Auth
  Staff --> Auth
  Client --> DB
  Staff --> DB
  Staff --> Store
  Staff --> Edge
  Client --> Edge
  Edge --> Store
  Edge --> Mail
  Edge --> Fax
  Client -.->|View in Jane| Jane
  Staff -.->|clinical record stays here| Jane
```

Jane is the clinical system of record. Supabase holds identity, the minimum demographics needed for a requisition, wellness notes that have a responsible clinician and NP approval, general education, and tracking the client types in. Lab results, diagnoses, medical history, clinical notes, prescriptions and NP treatment recommendations are not given tables in this database.

The public website stays a static GitHub Pages site. The person icon opens `/portal/`. Staff sign-in is `/staff/` and is not linked from the public navigation.
