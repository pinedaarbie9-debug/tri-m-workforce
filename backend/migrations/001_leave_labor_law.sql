-- 001_leave_labor_law.sql
BEGIN;

ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_leave_type_check
  CHECK (leave_type IN (
    'annual','sick','maternity','paternity','unpaid','emergency','compensatory',
    'service_incentive','solo_parent','vawc','special_women'
  ));

COMMIT;