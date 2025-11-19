-- Add phone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone TEXT;

-- Create function to sync profile changes to contacts
CREATE OR REPLACE FUNCTION public.sync_profile_to_contacts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update matching contact when profile is updated
  UPDATE public.client_contacts
  SET 
    name = NEW.full_name,
    phone = NEW.phone,
    updated_at = now()
  WHERE client_id = NEW.client_id
    AND email IN (
      SELECT email 
      FROM auth.users 
      WHERE id = NEW.id
    );
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically sync profile updates to contacts
CREATE TRIGGER on_profile_updated
  AFTER UPDATE OF full_name, phone ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_contacts();

-- Add updated_at column to client_contacts if it doesn't exist
ALTER TABLE public.client_contacts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to update client_contacts updated_at
CREATE OR REPLACE FUNCTION public.update_client_contacts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_client_contacts_timestamp
  BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_contacts_updated_at();