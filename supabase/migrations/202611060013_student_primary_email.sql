-- Require primary addresses rather than plus-tag aliases for discount identity claims.
-- Reject conflicting legacy records during rollout instead of deleting evidence.
alter table public.student_verifications add constraint student_primary_email
 check(position('+' in split_part(verified_email,'@',1))=0);
