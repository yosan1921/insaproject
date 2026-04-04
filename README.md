# CSRARS - Cybersecurity Risk Assessment & Reporting System

A comprehensive AI-powered risk assessment platform for analyzing cybersecurity questionnaires and generating detailed risk reports with automated analysis, real-time updates, and multi-format reporting capabilities.

---

## 📋 Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Project Structure](#project-structure)
- [Risk Analysis Workflow](#risk-analysis-workflow)
- [API Documentation](#api-documentation)
- [Data Models](#data-models)
- [Authentication & Security](#authentication--security)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## ✨ Features

### Core Functionality
- **AI-Powered Risk Analysis**: Automated risk assessment using OpenRouter API with GPT-4o Mini
- **Risk Register Management**: Track and manage risks with unique Risk Register IDs (RR-YYYY-####)
- **Multi-Level Analysis**: Operational, Tactical, and Strategic risk categorization
- **Real-time Updates**: Server-Sent Events (SSE) for live dashboard notifications
- **Interactive Dashboards**: Visual risk matrices, charts, and analytics
- **Multi-format Reports**: Export to Excel (.xlsx), PDF, Word (.docx), and PowerPoint (.pptx)

### Security & Access Control
- **Role-Based Access Control (RBAC)**: Director, Division Head, Risk Analyst, Staff roles
- **Multi-Factor Authentication (MFA)**: Optional 2FA using TOTP
- **Multi-tenancy Support**: Isolated data per organization
- **Secure Authentication**: NextAuth.js with encrypted credentials

### Additional Features
- **Asset Inventory**: Track company assets with VirusTotal integration
- **Threat Intelligence**: Monitor threats using Shodan API
- **Certificate Management**: Generate and manage compliance certificates
- **Email Notifications**: Automated alerts for critical risks
- **Audit Logging**: Track user activities and system events

---

## 🏗️ System Architecture

### Technology Stack

**Frontend**
- Next.js 14 (App Router)
- React 18 with TypeScript
- Tailwind CSS
- Recharts for data visualization

**Backend**
- Next.js API Routes
- MongoDB with Mongoose ODM
- Redis for caching and session management

**AI & Analysis**
- OpenRouter SDK (GPT-4o Mini)
- Custom risk scoring algorithms

**Authentication**
- NextAuth.js
- OTPLib for MFA

**Reporting**
- ExcelJS (Excel generation)
- jsPDF (PDF generation)
- docx (Word documents)
- pptxgenjs (PowerPoint presentations)

### Key Components

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│   API Routes    │◄────►│   MongoDB    │
│  (Backend API)  │      │  (Database)  │
└────────┬────────┘      └──────────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌─────────────┐  ┌─────────────┐
│  OpenRouter │  │    Redis    │
│  (AI API)   │  │  (Cache)    │
└─────────────┘  └─────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB database (local or cloud)
- Redis instance (optional, for caching)
- OpenRouter API key

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd insaproject
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env.local` file in the root directory (see [Environment Configuration](#environment-configuration))

4. **Run database migrations** (if needed)
```bash
node scripts/migrate-risk-ids.js
```

5. **Start the development server**
```bash
npm run dev
```

6. **Access the application**
Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Build

```bash
npm run build
npm start
```

---

## ⚙️ Environment Configuration

Create a `.env.local` file with the following variables:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-long-random-secret-string-here
ENCRYPTION_KEY=your-32-byte-hex-encryption-key

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Multi-Factor Authentication
MFA_ENABLED=true
MFA_REQUIRED_ROLES=Director,Division Head,Risk Analyst
NEXT_PUBLIC_MFA_ENABLED=true

# Redis (Optional)
REDIS_URL=redis://default:password@host:port

# AI Integration
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@your-domain.com
ADMIN_NOTIFICATION_EMAIL=admin@your-domain.com

# Webhook Security
WEBHOOK_SECRET=your-webhook-secret-key

# Asset & Threat Intelligence (Optional)
VIRUSTOTAL_API_KEY=your-virustotal-api-key
SHODAN_API_KEY=your-shodan-api-key
SCAN_ENABLED=true
```

---

## 📁 Project Structure

```
insaproject/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── analysis/             # Risk analysis endpoints
│   │   │   ├── process/          # Trigger analysis
│   │   │   ├── processed/        # Get analysis results
│   │   │   ├── reanalyze/        # Re-run analysis
│   │   │   └── get/              # Get specific analysis
│   │   ├── questionnaires/       # Questionnaire management
│   │   ├── reports/              # Report generation
│   │   ├── auth/                 # Authentication
│   │   ├── certificates/         # Certificate management
│   │   ├── threats/              # Threat intelligence
│   │   └── assets/               # Asset inventory
│   ├── components/               # Shared UI components
│   ├── dashboard/                # Dashboard pages
│   ├── risks/                    # Risk register page
│   ├── login/                    # Login page
│   ├── signup/                   # Registration page
│   └── layout.tsx                # Root layout
├── lib/                          # Core libraries
│   ├── services/                 # Business logic
│   │   ├── riskAnalyzer.ts       # AI risk analysis engine
│   │   ├── reportService.ts      # Report generation
│   │   ├── analysisLock.ts       # Distributed locking
│   │   └── updateanalysisService.ts
│   ├── utils/                    # Utility functions
│   │   └── ai.ts                 # AI integration utilities
│   ├── rbac/                     # Role-based access control
│   ├── security/                 # Security utilities
│   ├── mail/                     # Email services
│   ├── auth.ts                   # Authentication logic
│   ├── mongodb.ts                # Database connection
│   └── sseHub.ts                 # Real-time events
├── models/                       # MongoDB schemas
│   ├── RiskAnalysis.ts           # Risk analysis data
│   ├── Questionnaire.ts          # Questionnaire data
│   ├── User.ts                   # User accounts
│   ├── Report.ts                 # Generated reports
│   ├── Registration.ts           # Certificate registrations
│   └── AnalysisLock.ts           # Analysis locks
├── components/                   # Reusable components
│   └── RiskMatrix.tsx            # Risk matrix visualization
├── scripts/                      # Utility scripts
│   └── migrate-risk-ids.js       # Database migration
├── public/                       # Static assets
├── middleware.ts                 # Next.js middleware
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS config
└── package.json                  # Dependencies
```

---

## 🔄 Risk Analysis Workflow

### 1. Questionnaire Submission

Users submit questionnaires with questions categorized by level:
- **Operational**: Day-to-day security controls
- **Tactical**: Department-level security measures
- **Strategic**: Organization-wide security policies

### 2. Automated Analysis

```
Questionnaire Saved
       ↓
Post-save Hook Triggered
       ↓
Check for Existing Analysis
       ↓
Acquire Analysis Lock
       ↓
AI Analysis (OpenRouter)
       ↓
Calculate Risk Scores
       ↓
Generate Risk Register ID (RR-YYYY-####)
       ↓
Save RiskAnalysis Document
       ↓
Update Questionnaire Status
       ↓
Broadcast SSE Event
       ↓
Send Email Notifications (if critical)
       ↓
Release Lock
```

### 3. Risk Scoring Algorithm

```typescript
Risk Score = Likelihood × Impact

Likelihood Scale (1-5):
1 = Remote
2 = Low
3 = Moderate
4 = High
5 = Almost Certain

Impact Scale (1-5):
1 = Minimal
2 = Low
3 = Moderate
4 = High
5 = Critical

Risk Level Classification:
- CRITICAL: Score ≥ 16
- HIGH: Score ≥ 12
- MEDIUM: Score ≥ 6
- LOW: Score ≥ 2
- VERY_LOW: Score < 2
```

### 4. Risk Register ID Generation

Each risk analysis receives a unique ID:
- Format: `RR-YYYY-####`
- Example: `RR-2026-0001`
- Auto-incremented per year
- Generated via pre-save hook in RiskAnalysis model

---

## 📡 API Documentation

### Questionnaire Management

#### Import Questionnaire
```http
POST /api/questionnaires/fetch
Content-Type: application/json

{
  "id": "unique-id",
  "title": "Q4 2025 Security Assessment",
  "company_name": "Example Corp",
  "filled_by": "John Doe",
  "role": "Security Manager",
  "filled_date": "2025-11-26",
  "questions": [
    {
      "id": 1,
      "question": "Are firewalls configured?",
      "answer": "Yes",
      "section": "Network Security",
      "level": "operational"
    }
  ]
}
```

#### List Questionnaires
```http
GET /api/questionnaires/list
```

### Risk Analysis

#### Get Processed Analyses
```http
GET /api/analysis/processed

Response:
{
  "success": true,
  "assessments": [
    {
      "_id": "...",
      "riskRegisterId": "RR-2026-0001",
      "company": "Example Corp",
      "category": "operational",
      "date": "2025-11-26",
      "analyses": [...]
    }
  ]
}
```

#### Update Risk Analysis
```http
PATCH /api/analysis/processed/update
Content-Type: application/json

{
  "analysisId": "...",
  "level": "operational",
  "questionId": 1,
  "likelihood": 4,
  "impact": 3,
  "gap": "Updated gap analysis",
  "threat": "Updated threat description",
  "mitigation": "Updated mitigation strategy"
}
```

#### Trigger Re-analysis
```http
POST /api/analysis/reanalyze
Content-Type: application/json

{
  "questionnaireId": "..."
}
```

### Report Generation

#### Generate Report
```http
POST /api/reports/generate
Content-Type: application/json

{
  "analysisId": "...",
  "level": "strategic",
  "format": "pdf"
}
```

#### Export Report
```http
GET /api/reports/export?reportId=...&format=excel
```

### Real-time Updates

#### Subscribe to Events
```http
GET /api/notifications/stream
Accept: text/event-stream
```

---

## 🗄️ Data Models

### RiskAnalysis Schema

```typescript
{
  riskRegisterId: string,        // RR-2026-0001
  questionnaireId: ObjectId,     // Reference to Questionnaire
  company: string,
  category: "operational" | "tactical" | "strategic",
  tenantId: string,
  metadata: {
    timestamp: Date,
    totalQuestions: number,
    levels: {
      operational: number,
      tactical: number,
      strategic: number
    }
  },
  operational: [QuestionAnalysis],
  tactical: [QuestionAnalysis],
  strategic: [QuestionAnalysis],
  summary: {
    operational: Summary,
    tactical: Summary,
    strategic: Summary,
    overall: Summary
  },
  createdAt: Date,
  updatedAt: Date
}
```

### QuestionAnalysis Schema

```typescript
{
  questionId: number,
  section: string,
  question: string,
  answer: string,
  level: string,
  analysis: {
    likelihood: number,          // 1-5
    impact: number,              // 1-5
    riskScore: number,           // likelihood × impact
    riskLevel: string,           // CRITICAL, HIGH, MEDIUM, LOW, VERY_LOW
    riskColor: string,           // Hex color code
    gap: string,                 // Gap analysis
    threat: string,              // Threat description
    mitigation: string,          // Mitigation strategy
    impactLabel: string,         // Human-readable impact
    likelihoodLabel: string,     // Human-readable likelihood
    impactDescription: string    // Detailed impact description
  },
  timestamp: Date
}
```

---

## 🔐 Authentication & Security

### User Roles

1. **Director**: Full system access, user management
2. **Division Head**: Department-level access, report generation
3. **Risk Analyst**: Risk analysis, questionnaire management
4. **Staff**: View-only access to assigned data

### Multi-Factor Authentication

MFA is optional and can be configured per role:
- TOTP-based (Google Authenticator, Authy)
- QR code enrollment
- Backup codes for recovery

### Security Features

- Password hashing with bcrypt
- Session encryption
- CSRF protection
- Rate limiting on API endpoints
- Input validation with Zod
- SQL injection prevention (MongoDB)
- XSS protection

---

## 🚢 Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t csrars .
docker run -p 3000:3000 --env-file .env.local csrars
```

---

## 🐛 Troubleshooting

### Risk Register ID shows "N/A"

**Problem**: Existing records don't have Risk Register IDs

**Solution**: Run the migration script
```bash
node scripts/migrate-risk-ids.js
```

### Analysis not triggering automatically

**Problem**: Post-save hook not firing

**Solution**: 
1. Check MongoDB connection
2. Verify OPENROUTER_API_KEY is set
3. Check server logs for errors
4. Ensure questionnaire status is "pending"

### MFA not working

**Problem**: QR code not generating

**Solution**:
1. Verify MFA_ENABLED=true in .env.local
2. Check ENCRYPTION_KEY is set
3. Clear browser cache
4. Try different authenticator app

### Reports not generating

**Problem**: Export fails with error

**Solution**:
1. Check analysisId exists
2. Verify report format is supported
3. Check server disk space
4. Review server logs

---

## 🤝 Contributing

### Development Guidelines

1. Follow TypeScript best practices
2. Use meaningful variable names
3. Add comments for complex logic
4. Write unit tests for new features
5. Update documentation

### Code Style

- Use ESLint configuration
- Format with Prettier
- Follow Next.js conventions
- Use Tailwind CSS for styling

### Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📞 Support

For questions or issues, contact us:
- **Telegram**: @novat123
- **Email**: yosangonfa@gmail.com

---

## 📝 License

This project was developed as part of an internship program. Please note that the codebase may contain areas that need refactoring and improvement.

---

## 🙏 Acknowledgments

- OpenRouter for AI API access
- Next.js team for the framework
- MongoDB for database solutions
- All contributors and testers

---

**Note**: This project is under active development. Some features may be incomplete or require additional testing. We appreciate your patience and feedback as we continue to improve the system.
