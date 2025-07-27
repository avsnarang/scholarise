-- Database Indexes for Recipient Query Optimization
-- Run: psql -d your_database -f this_file.sql

-- ============================================================================
-- STUDENT TABLE INDEXES
-- ============================================================================

-- Primary index for student filtering (branch + active status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_branch_active 
ON "Student" (branch_id, is_active) 
WHERE is_active = true;

-- Composite index for student search with branch filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_search_optimized 
ON "Student" (branch_id, is_active, first_name, last_name, admission_number) 
WHERE is_active = true;

-- Index for class/section filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_section_class 
ON "Student" (section_id, branch_id, is_active) 
WHERE is_active = true;

-- Phone number index for contact lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_phone 
ON "Student" (phone) 
WHERE phone IS NOT NULL AND phone != '';

-- ============================================================================
-- TEACHER TABLE INDEXES  
-- ============================================================================

-- Primary index for teacher filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teacher_branch_active 
ON "Teacher" (branch_id, is_active) 
WHERE is_active = true;

-- Teacher search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teacher_search_optimized 
ON "Teacher" (branch_id, is_active, first_name, last_name, employee_code) 
WHERE is_active = true;

-- Teacher phone index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teacher_phone 
ON "Teacher" (phone) 
WHERE phone IS NOT NULL AND phone != '';

-- ============================================================================
-- EMPLOYEE TABLE INDEXES
-- ============================================================================

-- Primary index for employee filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_branch_active 
ON "Employee" (branch_id, is_active) 
WHERE is_active = true;

-- Employee search optimization  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_search_optimized 
ON "Employee" (branch_id, is_active, first_name, last_name) 
WHERE is_active = true;

-- Employee phone index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_phone 
ON "Employee" (phone) 
WHERE phone IS NOT NULL AND phone != '';

-- ============================================================================
-- PARENT TABLE INDEXES (for contact phone lookups)
-- ============================================================================

-- Parent phone indexes for fast phone number lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parent_father_mobile 
ON "Parent" (father_mobile) 
WHERE father_mobile IS NOT NULL AND father_mobile != '';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parent_mother_mobile 
ON "Parent" (mother_mobile) 
WHERE mother_mobile IS NOT NULL AND mother_mobile != '';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parent_guardian_mobile 
ON "Parent" (guardian_mobile) 
WHERE guardian_mobile IS NOT NULL AND guardian_mobile != '';

-- ============================================================================
-- SECTION/CLASS RELATIONSHIP INDEXES
-- ============================================================================

-- Section to class relationship for joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_section_class_id 
ON "Section" (class_id, id);

-- Class name for joins and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_name 
ON "Class" (name, branch_id);

-- ============================================================================
-- TEXT SEARCH INDEXES (for faster ILIKE queries)
-- ============================================================================

-- GIN indexes for case-insensitive text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_name_gin 
ON "Student" USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teacher_name_gin 
ON "Teacher" USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_name_gin 
ON "Employee" USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- Enable trigram extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- COMMUNICATION/TEMPLATE RELATED INDEXES
-- ============================================================================

-- Template filtering by active status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_active 
ON "Template" (is_active, status) 
WHERE is_active = true;

-- Message status for communication history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communication_message_status 
ON "CommunicationMessage" (status, branch_id, created_at);

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Check index usage (run after deployment)
-- SELECT schemaname, tablename, attname, inherited, n_distinct, correlation 
-- FROM pg_stats 
-- WHERE tablename IN ('Student', 'Teacher', 'Employee', 'Parent');

-- Monitor query performance
-- SELECT query, mean_time, calls 
-- FROM pg_stat_statements 
-- WHERE query LIKE '%Student%' OR query LIKE '%Teacher%' OR query LIKE '%Employee%'
-- ORDER BY mean_time DESC; 