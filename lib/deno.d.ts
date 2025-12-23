// Type declarations for Deno globals
declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
}

// Type declarations for remote modules used in Edge Functions
declare module 'https://deno.land/std@0.190.0/http/server.ts' {
  export function serve(handler: (req: Request) => Promise<Response>): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.45.0' {
  export * from '@supabase/supabase-js';
}

declare module 'https://esm.sh/rss-parser@3.13.0' {
  import Parser from 'rss-parser';
  export default Parser;
}

// Fix for relative import path in Deno environment
declare module '../_shared/auth.ts' {
  export * from './_shared/auth';
}