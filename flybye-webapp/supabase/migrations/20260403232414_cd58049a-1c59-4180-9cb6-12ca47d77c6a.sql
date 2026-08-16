-- The discover feature requires viewing other users' flights for airport/destination display
-- Restore authenticated-only access (which is already more secure than the original)
DROP POLICY IF EXISTS "Users can view relevant flights" ON public.flights;

CREATE POLICY "Authenticated users can view flights" ON public.flights
FOR SELECT TO authenticated
USING (true);