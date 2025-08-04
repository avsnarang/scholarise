# Student Status Migration - Module Update Status

## ✅ COMPLETED UPDATES

### Core Student System
- **✅ Student Router** (`src/server/api/routers/student.ts`)
  - Updated `fuzzySearchStudents` to use `status: "ACTIVE"`
  - Updated `bulkUpdateStatus` to update both status and isActive fields
  - Updated `getByClassAndSection` to use `status: "ACTIVE"`
  - Updated isActive filter mapping to use status system

- **✅ Student Pages** (`src/app/students/`)
  - Added clarifying comments about isActive filtering
  - Default filters now show ACTIVE status students only

- **✅ Dashboard Router** (`src/server/api/routers/dashboard.ts`)
  - Updated main student count to use `status: "ACTIVE"`

## ⚠️ MODULES NEEDING REVIEW

### High Priority - Business Logic Impact

#### 🔴 Finance Router (`src/server/api/routers/finance.ts`)
**Status**: Needs systematic review  
**Issue**: 60+ instances of `isActive: true` found  
**Action Needed**: 
- Distinguish between fee collection (should target ENROLLED students) vs reporting (ACTIVE only)
- Review fee defaulter logic - should include REPEAT and SUSPENDED students
- Update concession targeting

#### 🔴 Communication Router (`src/server/api/routers/communication.ts`)
**Status**: Needs review  
**Issue**: Uses `isActive: true` for message targeting  
**Action Needed**:
- Update to target ENROLLED students (ACTIVE, REPEAT, SUSPENDED)
- Ensure important communications reach all students who can attend

### Medium Priority - Operational Impact

#### 🟡 Attendance Router (`src/server/api/routers/attendance.ts`)
**Status**: Needs review  
**Issue**: Attendance tracking may use isActive filtering  
**Action Needed**:
- Ensure attendance tracking covers all ENROLLED students
- SUSPENDED students should still have attendance tracked

#### 🟡 Examination Router (`src/server/api/routers/examination.ts`)
**Status**: Needs review  
**Issue**: Multiple `isActive: true` instances  
**Action Needed**:
- Review exam eligibility - may need ENROLLED students
- Assessment scoring should include REPEAT students

#### 🟡 Courtesy Calls (`src/server/api/routers/courtesy-calls.ts`)
**Status**: Needs review  
**Issue**: Uses `isActive: true` for student selection  
**Action Needed**:
- Should target ENROLLED students for courtesy calls

## 📋 MIGRATION CHECKLIST

### Immediate Actions Required:

- [ ] **Finance Router Review** - Distinguish fee operations from reporting
- [ ] **Communication Targeting** - Update to include all enrolled students  
- [ ] **Attendance Logic** - Ensure all enrolled students are tracked
- [ ] **Testing** - Verify critical user flows work with new logic

### Secondary Actions:

- [ ] Update remaining dashboard `isActive` instances
- [ ] Review examination router logic
- [ ] Update courtesy call targeting
- [ ] Add status-aware components to UI

## 🎯 KEY PRINCIPLES FOR UPDATES

### When to use ACTIVE vs ENROLLED:

1. **Use ACTIVE status only**:
   - Dashboard "active student" counts
   - Reports labeled "active students"
   - Enrollment statistics

2. **Use ENROLLED statuses** (ACTIVE, REPEAT, SUSPENDED):
   - Fee collection and billing
   - Communications and messages
   - Attendance tracking
   - Class rosters
   - Courtesy calls

3. **Business Logic Examples**:
   ```typescript
   // Dashboard stats - ACTIVE only
   activeStudentCount: { where: { status: "ACTIVE" } }
   
   // Fee collection - All enrolled students
   feeEligible: { where: { status: { in: ["ACTIVE", "REPEAT", "SUSPENDED"] } } }
   
   // Communications - All enrolled students  
   messageTargets: { where: { status: { in: ["ACTIVE", "REPEAT", "SUSPENDED"] } } }
   ```

## 🚨 CRITICAL REMINDERS

- **"Active students only"** = `status: "ACTIVE"` (not isActive: true)
- **EXPELLED** and **WITHDRAWN** = INACTIVE for all purposes
- **REPEAT** and **SUSPENDED** = Can still attend classes, receive communications, pay fees
- **Legacy compatibility** maintained with automatic isActive mapping

## 📞 NEXT STEPS

1. **Priority 1**: Review and update Finance router (fee collection logic)
2. **Priority 2**: Update Communication router (message targeting) 
3. **Priority 3**: Review Attendance and Examination routers
4. **Testing**: Validate critical flows after each update
5. **Documentation**: Update API docs to reflect status options