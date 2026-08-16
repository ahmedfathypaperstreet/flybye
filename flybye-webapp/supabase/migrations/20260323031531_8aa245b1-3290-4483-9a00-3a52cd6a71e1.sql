CREATE POLICY "Users can delete own match requests"
ON public.matches
FOR DELETE
TO authenticated
USING (auth.uid() = requester_id);