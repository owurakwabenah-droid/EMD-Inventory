# EMD Inventory Sync

Continue this EMD Inventory project and preserve the existing Supabase integration.

Supabase project URL:

https://byhxgazvtznzlcugpbdf.supabase.co

Use the existing publishable key through environment variables only:

VITE_SUPABASE_URL

VITE_SUPABASE_ANON_KEY

Do not replace, expose, or hardcode any service-role key. Preserve the existing database schema, authentication, RLS policies, offline queue, login tracking, username/email login, and user roles:

- Boison: main admin

- Afoga: regular sales user

- Rosemond: regular sales user

Do not rewrite the database schema without checking the existing Supabase tables first. Keep offline-first behavior and synchronize queued changes when the connection returns. Use Supabase Auth for passwords and never store plaintext passwords in database tables or frontend code.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ee8d785b-5e11-4e0c-a0f6-0ac355d38edc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
