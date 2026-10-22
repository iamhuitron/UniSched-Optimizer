# 🏛️ UniSched Optimizer Architecture & System Topology

Algorithmic course schedule optimizer and constraint satisfaction solver for Mexican university students (UNAM FES Cuautitlán, FI, FES Aragón, IPN ESCOM, UPIICSA, UAM). Built with Next.js 15, TypeScript, React, and in-browser PDF/OCR parsing. Employs recursive backtracking to generate conflict-free academic schedules in sub-second time.

---

## 1. Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 & React 19 | Client-rendered privacy-first web application (zero server latency) |
| **Language** | TypeScript 5 (Strict Mode) | Full type safety for course sections, schedules, and conflict matrices |
| **Algorithmic Engine** | Backtracking & CSP Solver | Constraint satisfaction problem (CSP) pruning branch collisions early |
| **Parsing Engine** | `pdf.js` & `tesseract.js` | Client-side PDF catalog extraction and OCR for photo schedules |
| **Styling** | CSS Modules & Modern CSS | Responsive time-grid layout with collision color coding |
| **Testing** | Node.js / Jest / Vitest | Unit tests for collision detection, time intervals, and solver pruning |

---

## 2. System Topology & Component Graph

```mermaid
flowchart TD
    subgraph DataInputs["Course Data Ingestion"]
        CatalogFiles["Pre-built University Catalogs (public/fixtures/)"]
        PDFUpload["PDF Schedule / Image Upload"]
        Manual["Manual Subject Entry (components/ManualBuilder.tsx)"]
    end

    subgraph ParsingLayer["In-Browser Parsers (src/lib/)"]
        PDFParser["PDF Parser (pdf.js)"]
        OCR["Tesseract OCR Engine"]
        CatalogNormalizer["Catalog Normalizer (src/lib/catalog.ts)"]
    end

    subgraph ConstraintSolver["Algorithmic Core (src/lib/)"]
        ConflictEngine["Collision Detector (src/lib/conflicts.ts)"]
        TimeUtils["Time Interval Math (src/lib/time.ts)"]
        BacktrackingSolver["Recursive CSP Solver (src/lib/solver.ts)"]
        PrefEvaluator["Preference Ranker (Free Days, Compactness)"]
    end

    subgraph UIComponents["Presentation Layer (src/components/)"]
        Browser["Catalog Browser (components/CatalogBrowser.tsx)"]
        Prefs["Preferences Form (components/PreferencesForm.tsx)"]
        Grid["Interactive Time Grid (components/ScheduleGrid.tsx)"]
        Results["Ranked Solution List (components/ResultsList.tsx)"]
    end

    CatalogFiles --> CatalogNormalizer
    PDFUpload --> PDFParser
    PDFUpload --> OCR
    PDFParser --> CatalogNormalizer
    OCR --> CatalogNormalizer
    Manual --> CatalogNormalizer
    CatalogNormalizer --> BacktrackingSolver
    Prefs --> PrefEvaluator
    BacktrackingSolver --> ConflictEngine
    ConflictEngine --> TimeUtils
    BacktrackingSolver --> PrefEvaluator
    PrefEvaluator --> Results
    Results --> Grid
```

---

## 3. Constraint Satisfaction (CSP) Solving Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Student as UNAM / IPN Student
    participant UI as Preferences Form
    participant Normalizer as Catalog Engine
    participant Solver as Backtracking Engine
    participant Grid as Interactive Grid

    Student->>UI: Selects 6 subjects and sets preferences (e.g. Free Fridays, No 7am classes)
    UI->>Normalizer: Assemble active subject groups and candidate sections
    Normalizer->>Solver: solve(subjects, preferences)
    Solver->>Solver: Sort subjects by domain size (fail-first heuristic)
    loop Recursive Backtracking
        Solver->>Solver: Pick section from Subject_i
        Solver->>Solver: hasTimeOverlap(existingSchedule, section)
        alt Overlap detected
            Solver->>Solver: Prune branch immediately (skip descendants)
        else No overlap
            Solver->>Solver: Add to partial schedule and recurse Subject_i+1
        end
    end
    Solver->>Solver: Rank valid solutions by score (compactness, preferred professors)
    Solver-->>Results: Return top N conflict-free combinations (< 50ms)
    Student->>Grid: Hover / select combination to visualize calendar block
```

---

## 4. Directory Structure & Module Breakdown

```
unisched-optimizer/
├── src/
│   ├── app/                  # Next.js App Router entrypoints
│   │   ├── layout.tsx        # HTML shell and metadata
│   │   ├── globals.css       # Design tokens and base styling
│   │   └── page.tsx          # Main single-page application dashboard
│   ├── components/           # UI components
│   │   ├── CatalogBrowser.tsx# University catalog selector (UNAM, IPN, UAM)
│   │   ├── PreferencesForm.tsx# Student constraint sliders (gaps, hours, days)
│   │   ├── ScheduleGrid.tsx  # Interactive weekly calendar (Monday-Saturday)
│   │   ├── ResultsList.tsx   # Ranked viable schedule cards with metrics
│   │   ├── ManualBuilder.tsx # Custom course and section creation panel
│   │   └── UploadPanel.tsx   # Drag-and-drop PDF/image schedule parser
│   └── lib/                  # Pure TypeScript domain & algorithmic logic
│       ├── solver.ts         # Recursive backtracking CSP solver with heuristic pruning
│       ├── conflicts.ts      # Pairwise and interval schedule clash detectors
│       ├── time.ts           # Minute-based time math, conversions, and formats
│       ├── catalog.ts        # Course and group schema validators
│       ├── types.ts          # Core interfaces (Section, Subject, Schedule, Preference)
│       └── *.test.ts         # Unit tests verifying collision math and solver logic
├── public/fixtures/          # Preloaded official university schedules (JSON)
│   ├── fes-cuautitlan-*.json # UNAM FES Cuautitlán (Informatica, Industrial)
│   ├── ipn-*.json            # IPN (ESCOM Sistemas, UPIICSA Informática)
│   └── unam-*.json           # UNAM (Facultad de Ingeniería, FES Aragón MAC)
├── scripts/scraper/          # Web and catalog scrapers for university schedules
├── package.json              # Project dependencies and build scripts
└── tsconfig.json             # TypeScript compiler settings
```
