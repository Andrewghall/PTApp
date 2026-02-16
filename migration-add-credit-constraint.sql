-- Add constraint to prevent negative credit balances
-- This ensures credits can never go below 0

ALTER TABLE credit_balances
ADD CONSTRAINT credit_balance_non_negative
CHECK (balance >= 0);

-- Add comment
COMMENT ON CONSTRAINT credit_balance_non_negative ON credit_balances IS
'Prevents credit balance from going negative - enforces credit limits at database level';
