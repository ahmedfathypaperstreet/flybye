-- Fix match update policy to restrict status transitions
DROP POLICY IF EXISTS "Users can update matches they received" ON public.matches;
CREATE POLICY "Users can update matches they received"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = target_id)
  WITH CHECK (
    auth.uid() = target_id
    AND status IN ('accepted', 'declined')
  );