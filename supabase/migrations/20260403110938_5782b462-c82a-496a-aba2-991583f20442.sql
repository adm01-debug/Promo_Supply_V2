CREATE POLICY "Owner can delete own comprovantes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'comprovantes' AND owner::uuid = auth.uid());