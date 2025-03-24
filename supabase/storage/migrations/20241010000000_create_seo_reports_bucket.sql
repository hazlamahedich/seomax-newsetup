-- Create a new bucket for storing SEO audit report PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('seo-reports', 'seo-reports', true);

-- Set up RLS (Row-Level Security) policies for the bucket
-- Allow authenticated users to read any file
CREATE POLICY "Allow authenticated users to read report PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'seo-reports');

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to insert report PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'seo-reports');

-- Allow authenticated users to update files they own
CREATE POLICY "Allow users to update their own report PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'seo-reports' AND owner = auth.uid());

-- Allow authenticated users to delete files they own
CREATE POLICY "Allow users to delete their own report PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'seo-reports' AND owner = auth.uid()); 