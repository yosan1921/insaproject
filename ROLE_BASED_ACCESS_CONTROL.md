# Role-Based Access Control (RBAC) Documentation
## CSRARS System - Complete Role Permissions Guide

---

## Overview

The CSRARS system implements a comprehensive Role-Based Access Control (RBAC) system with 4 distinct user roles, each with specific permissions and capabilities.

---

## User Roles

### 1. Director (Highest Authority)
### 2. Division Head (Department Management)
### 3. Risk Analyst (Operational Analysis)
### 4. Staff (View-Only Access)

---

## Detailed Role Permissions

### 🔴 DIRECTOR
**Authority Level:** Full System Access

#### User Management
✅ **Can Do:**
- View all users in the system
- Create new user accounts
- Update user roles (promote/demote users)
- Delete user accounts
- Assign users to departments
- View user activity logs
- Manage user permissions

❌ **Cannot Do:**
- None (Full access)

#### Risk Assessment
✅ **Can Do:**
- View all risk assessments across all organizations
- Create new questionnaires
- Submit questionnaires for analysis
- Review AI-generated risk analyses
- Manually adjust risk scores
- Approve/reject risk analyses
- Re-trigger analysis for any questionnaire
- Export risk data in all formats
- Access historical risk data

❌ **Cannot Do:**
- None (Full access)

#### National Benchmarking
✅ **Can Do:**
- View national overview dashboard
- See ALL sector performance metrics
- View organization rankings with **REAL COMPANY NAMES**
- Compare sectors
- Export benchmarking reports
- Access compliance tracking data
- View top vulnerabilities across all sectors
- Monitor national average risk scores

❌ **Cannot Do:**
- None (Full access)

#### Reporting
✅ **Can Do:**
- Generate reports for any organization
- Export in all formats (PDF, Excel, Word, PowerPoint)
- Schedule automated reports
- Create custom report templates
- Access all historical reports
- Share reports with external stakeholders

❌ **Cannot Do:**
- None (Full access)

#### System Administration
✅ **Can Do:**
- Configure system settings
- Manage MFA requirements
- View audit logs
- Monitor system performance
- Configure email notifications
- Manage API integrations
- Access system health metrics

❌ **Cannot Do:**
- None (Full access)

#### Communication
✅ **Can Do:**
- Chat with all Division Heads
- Send notifications to all users
- Broadcast system-wide announcements
- View all chat history

❌ **Cannot Do:**
- None (Full access)

---

### 🟠 DIVISION HEAD
**Authority Level:** Department-Level Management

#### User Management
✅ **Can Do:**
- View users in their department
- View user activity in their department
- Request user role changes (requires Director approval)

❌ **Cannot Do:**
- Create new users
- Update user roles directly
- Delete users
- View users outside their department
- Access system-wide user management

#### Risk Assessment
✅ **Can Do:**
- View risk assessments for their department
- Create questionnaires for their department
- Submit questionnaires for analysis
- Review AI-generated risk analyses
- Manually adjust risk scores for their department
- Approve risk analyses for their department
- Re-trigger analysis for their questionnaires
- Export risk data for their department

❌ **Cannot Do:**
- View risk assessments from other departments (unless shared)
- Modify analyses from other departments
- Delete risk analyses

#### National Benchmarking
✅ **Can Do:**
- View national overview dashboard
- See ALL sector performance metrics
- View organization rankings with **REAL COMPANY NAMES**
- Compare sectors
- Export benchmarking reports
- Access compliance tracking data
- View top vulnerabilities across all sectors

❌ **Cannot Do:**
- Modify benchmarking data
- Delete sector information

#### Reporting
✅ **Can Do:**
- Generate reports for their department
- Export in all formats (PDF, Excel, Word, PowerPoint)
- Access historical reports for their department
- Share reports with Director and team members

❌ **Cannot Do:**
- Generate reports for other departments
- Access reports from other departments (unless shared)
- Create system-wide report templates

#### System Administration
✅ **Can Do:**
- View their department's audit logs
- Monitor their department's performance metrics
- Configure department-level notifications

❌ **Cannot Do:**
- Configure system-wide settings
- Manage MFA requirements
- Access system health metrics
- Manage API integrations

#### Communication
✅ **Can Do:**
- Chat with Director
- Chat with Risk Analysts in their department
- Chat with Staff in their department
- Send notifications to their department
- View department chat history

❌ **Cannot Do:**
- Chat with other Division Heads (unless through Director)
- Send system-wide announcements
- View chat history from other departments

---

### 🟡 RISK ANALYST
**Authority Level:** Operational Analysis

#### User Management
✅ **Can Do:**
- View their own profile
- Update their own profile information
- View team members in their department

❌ **Cannot Do:**
- Create users
- Update user roles
- Delete users
- View users outside their team
- Access user management features

#### Risk Assessment
✅ **Can Do:**
- View risk assessments assigned to them
- Create questionnaires
- Submit questionnaires for analysis
- Review AI-generated risk analyses
- Manually adjust risk scores (for assigned assessments)
- Add comments and notes to analyses
- Request re-analysis
- Export risk data for assigned assessments

❌ **Cannot Do:**
- View all risk assessments (only assigned ones)
- Delete risk analyses
- Approve final risk analyses (requires Division Head/Director)
- Access assessments from other departments

#### National Benchmarking
✅ **Can Do:**
- View national overview dashboard
- See sector performance metrics
- View organization rankings with **ANONYMIZED NAMES** (e.g., "Banking Organization #1")
- Compare sectors
- Export benchmarking reports (anonymized)
- View compliance tracking data

❌ **Cannot Do:**
- See real company names in benchmarking
- Modify benchmarking data
- Delete sector information

#### Reporting
✅ **Can Do:**
- Generate reports for assigned assessments
- Export in all formats (PDF, Excel, Word, PowerPoint)
- Access historical reports for their work
- Share reports with Division Head

❌ **Cannot Do:**
- Generate reports for unassigned assessments
- Access reports from other analysts
- Create custom report templates

#### System Administration
✅ **Can Do:**
- View their own activity logs
- Monitor their assigned tasks

❌ **Cannot Do:**
- Configure system settings
- Manage MFA requirements
- Access system health metrics
- View audit logs
- Manage API integrations

#### Communication
✅ **Can Do:**
- Chat with Division Head
- Chat with other Risk Analysts in their department
- Receive notifications for assigned tasks
- View their chat history

❌ **Cannot Do:**
- Chat with Director directly
- Chat with Staff
- Send department-wide notifications
- View other users' chat history

#### Notifications
✅ **Can Do:**
- Receive notifications for:
  - New questionnaire assignments
  - Analysis completion
  - Risk score updates
  - Comments on their work

❌ **Cannot Do:**
- Receive system-wide notifications
- Receive notifications for other departments

---

### 🟢 STAFF
**Authority Level:** View-Only Access

#### User Management
✅ **Can Do:**
- View their own profile
- Update their own profile information

❌ **Cannot Do:**
- View other users
- Create users
- Update user roles
- Delete users
- Access user management features

#### Risk Assessment
✅ **Can Do:**
- View risk assessments assigned to them (read-only)
- Create questionnaires (if permitted by Division Head)
- Submit questionnaires for analysis
- View AI-generated risk analyses (read-only)

❌ **Cannot Do:**
- Modify risk scores
- Approve risk analyses
- Delete risk analyses
- Re-trigger analysis
- Access unassigned assessments
- Export risk data

#### National Benchmarking
✅ **Can Do:**
- View national overview dashboard (read-only)
- See sector performance metrics
- View organization rankings with **ANONYMIZED NAMES** (e.g., "Banking Organization #1")
- View compliance tracking data

❌ **Cannot Do:**
- See real company names in benchmarking
- Export benchmarking reports
- Modify benchmarking data
- Compare sectors (limited view)

#### Reporting
✅ **Can Do:**
- View reports for assigned assessments (read-only)

❌ **Cannot Do:**
- Generate reports
- Export reports
- Access historical reports
- Share reports

#### System Administration
✅ **Can Do:**
- View their own activity

❌ **Cannot Do:**
- Configure any settings
- Manage MFA
- Access system metrics
- View audit logs
- Manage integrations

#### Communication
✅ **Can Do:**
- Chat with assigned Division Head (if task assigned)
- Receive notifications for assigned tasks
- View their chat history

❌ **Cannot Do:**
- Chat with Director
- Chat with Risk Analysts
- Chat with other Staff
- Send notifications

#### Notifications
✅ **Can Do:**
- Receive notifications for:
  - Task assignments
  - Questionnaire submissions
  - Analysis completion (for their submissions)

❌ **Cannot Do:**
- Receive system-wide notifications
- Receive notifications for other users' work

---

## Role Hierarchy

```
Director (Level 4 - Highest)
    ↓
Division Head (Level 3)
    ↓
Risk Analyst (Level 2)
    ↓
Staff (Level 1 - Lowest)
```

**Inheritance:** Higher roles inherit all permissions from lower roles, plus additional privileges.

---

## Special Permissions Summary

### Real Company Names in Benchmarking
- **Can See Real Names:** Director, Division Head
- **See Anonymized Names:** Risk Analyst, Staff

**Example:**
- Director sees: "Commercial Bank of Ethiopia"
- Risk Analyst sees: "Banking & Finance Organization #1"

### User Role Management
- **Can Change Roles:** Director only
- **Can Request Role Changes:** Division Head (requires Director approval)
- **Cannot Change Roles:** Risk Analyst, Staff

### System-Wide Access
- **Full System Access:** Director
- **Department Access:** Division Head
- **Team/Assignment Access:** Risk Analyst
- **Personal Access Only:** Staff

### Report Generation
- **All Organizations:** Director
- **Department Only:** Division Head
- **Assigned Only:** Risk Analyst
- **View Only:** Staff

### Communication Permissions
- **Chat with Everyone:** Director
- **Chat with Department:** Division Head
- **Chat with Supervisor:** Risk Analyst
- **Limited Chat:** Staff

---

## Multi-Factor Authentication (MFA)

### MFA Requirements by Role
- **Director:** MFA REQUIRED (mandatory)
- **Division Head:** MFA REQUIRED (mandatory)
- **Risk Analyst:** MFA REQUIRED (mandatory)
- **Staff:** MFA OPTIONAL

### MFA Configuration
- Configured in `.env.local`:
  ```
  MFA_ENABLED=true
  MFA_REQUIRED_ROLES=Director,Division Head,Risk Analyst
  ```

---

## API Endpoint Access Control

### Public Endpoints (No Authentication)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login

### Authenticated Endpoints (All Roles)
- `GET /api/users/me` - Get current user profile
- `POST /api/users/update` - Update own profile
- `GET /api/questionnaires/list` - List questionnaires (filtered by role)
- `GET /api/analysis/processed` - Get analyses (filtered by role)
- `GET /api/benchmarking/national` - National overview
- `GET /api/benchmarking/sector/[name]` - Sector details (anonymized based on role)

### Division Head & Director Only
- `GET /api/users/list` - List all users
- `GET /api/reports/list` - List all reports
- `POST /api/reports/generate` - Generate reports

### Director Only
- `POST /api/users/update-role` - Update user roles
- `DELETE /api/users/[id]` - Delete users
- `GET /api/system/health` - System health metrics
- `POST /api/system/config` - Update system configuration

---

## Role-Based UI Elements

### Navigation Menu
**Director:**
- Dashboard
- Risk Register
- National Benchmarking
- Reports
- Users (Admin)
- System Settings
- Audit Logs

**Division Head:**
- Dashboard
- Risk Register (Department)
- National Benchmarking
- Reports (Department)
- Team Management

**Risk Analyst:**
- Dashboard
- Risk Register (Assigned)
- National Benchmarking (Anonymized)
- My Reports

**Staff:**
- Dashboard (Read-only)
- My Assessments (Read-only)
- Benchmarking (Read-only)

---

## Data Visibility Matrix

| Data Type | Director | Division Head | Risk Analyst | Staff |
|-----------|----------|---------------|--------------|-------|
| All Organizations | ✅ | ❌ | ❌ | ❌ |
| Department Data | ✅ | ✅ | ❌ | ❌ |
| Assigned Data | ✅ | ✅ | ✅ | ❌ |
| Own Data | ✅ | ✅ | ✅ | ✅ |
| Real Company Names | ✅ | ✅ | ❌ | ❌ |
| Anonymized Names | ✅ | ✅ | ✅ | ✅ |
| Audit Logs (All) | ✅ | ❌ | ❌ | ❌ |
| Audit Logs (Dept) | ✅ | ✅ | ❌ | ❌ |
| System Metrics | ✅ | ❌ | ❌ | ❌ |

---

## Security Features

### Session Management
- JWT-based authentication
- Session expiration: 24 hours
- Automatic logout on inactivity
- Secure cookie storage

### Password Security
- bcrypt hashing (10 rounds)
- Minimum 8 characters
- Password complexity requirements
- Password reset via email

### Access Control
- Role-based middleware
- API endpoint protection
- UI element hiding based on role
- Database query filtering by role

### Audit Logging
- All user actions logged
- Role changes tracked
- Data access logged
- Failed login attempts recorded

---

## Role Assignment Process

### Initial User Creation
1. Director creates user account
2. Assigns initial role
3. User receives welcome email
4. User sets up MFA (if required)
5. User logs in with assigned role

### Role Change Process
1. Director initiates role change
2. System validates new role
3. User receives notification email
4. Role updated in database
5. Audit log created
6. User must re-login to apply new permissions

---

## Best Practices

### For Directors
- Regularly review user roles
- Monitor audit logs
- Assign roles based on job function
- Enable MFA for all sensitive roles
- Review benchmarking data for insights

### For Division Heads
- Monitor department performance
- Review team member work
- Request role changes when needed
- Use benchmarking for improvement
- Generate regular reports

### For Risk Analysts
- Focus on assigned assessments
- Provide detailed analysis
- Communicate with Division Head
- Use anonymized benchmarking for context
- Document findings thoroughly

### For Staff
- Complete assigned questionnaires
- Report issues to supervisor
- View benchmarking for awareness
- Follow security guidelines

---

## Troubleshooting

### "Forbidden" Error
**Cause:** User role doesn't have permission for the action
**Solution:** Contact Director to request role change or permission

### Cannot See Real Company Names
**Cause:** User is Risk Analyst or Staff
**Solution:** Only Directors and Division Heads can see real names

### Cannot Access Certain Features
**Cause:** Feature restricted to higher roles
**Solution:** Request access from Division Head or Director

### MFA Required Error
**Cause:** MFA not set up or verified
**Solution:** Complete MFA setup in profile settings

---

## Future Enhancements

### Planned Role Features
- Custom role creation
- Granular permission management
- Temporary role elevation
- Role-based dashboards
- Advanced audit reporting
- Role-based data retention policies

---

## Contact & Support

For role-related questions or access issues:
- **Email:** yosangonfa@gmail.com
- **Telegram:** @novat123
- **System Admin:** Contact your Director

---

**Last Updated:** December 2024
**Version:** 1.0
**System:** CSRARS - Cybersecurity Risk Assessment & Reporting System
