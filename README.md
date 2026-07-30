# Officer resolution review interface

The provenance-grounded review interface of
[TRACE](https://github.com/ucbepic/trace), which turns raw California police record
disclosures into a structured, searchable database and links every component
repository and the technical report.

An analyst uses this interface to verify a candidate match between an officer named
in a disclosed document and a record in California's POST (Peace Officer Standards
and Training) database. Each candidate is presented as one review unit carrying the
matched POST record and its employment timeline together with the passages the match
was drawn from, which means a name can be confirmed without opening the source
documents.

Deployed at [post-validation.vercel.app](https://post-validation.vercel.app).

## Running locally

​```bash
npm install
npm run dev
​```

The interface runs at `localhost:3000`. It reads from Supabase, and the required
environment variables are listed in `.env.example`.
