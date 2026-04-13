This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Local Auth Setup

To keep OAuth sign-in in your localhost testing environment (and avoid redirects to production), configure both your local env and Supabase Auth settings:

1. In local env (`.env.local`), set:

```bash
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
```

2. In Supabase Dashboard, add these redirect URLs in **Authentication → URL Configuration**:

- `http://localhost:3000/api/auth/callback`
- `http://127.0.0.1:3000/api/auth/callback`
- Keep your production callback URL (for example `https://signup.krowehub.com/api/auth/callback`) as well.

The app will use `NEXT_PUBLIC_APP_ORIGIN` in non-production builds and otherwise fall back to `window.location.origin`.

## MongoDB Atlas Setup (Beginner)

Use this setup for semantic deduplication in the interview pipeline.

1. Create an Atlas account at `https://www.mongodb.com/atlas` and create a free `M0` cluster.
2. Create a database user in Atlas (`Database Access`) and save the username/password.
3. Add a network access rule in `Network Access`:
- For local development only, add `0.0.0.0/0`.
- Later, restrict this to your server/Vercel egress IPs.
4. In Atlas, open `Connect` for your cluster and copy the SRV connection string (`mongodb+srv://...`).
5. Add these variables to `.env.local`:

```bash
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-url>/?retryWrites=true&w=majority
MONGODB_DB_NAME=krowe
MONGODB_PROBLEMS_COLLECTION=problems
MONGODB_VECTOR_INDEX_NAME=problems_embedding_idx
```

6. Create a Vector Search index on the `problems` collection:
- Field path: `embedding`
- Dimensions: `1536` (matches `text-embedding-3-small`)
- Similarity: `cosine`
- Add `projectId` as a filter field in the index definition.
7. Restart the app and run interview processing; the backend will use Mongo dedup when configured, and fall back safely when not configured.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
