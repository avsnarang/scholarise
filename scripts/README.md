# ScholaRise Seed Scripts

This directory contains various scripts for seeding the database with test data for development purposes.

## Available Seed Scripts

### Branch and Academic Session Seed
Populates the database with school branches and academic sessions.

```bash
npm run db:seed:branches
```

This script creates:
- 3 school branches (Paonta Sahib, Juniors, and Majra)
- 3 academic sessions (last year, current year, and next year)

### Classes and Students Seed
Populates the database with classes and student data for each branch and academic session.

```bash
npm run db:seed:classes
```

This script creates:
- Various classes for each branch based on Indian education system (Nursery, LKG, UKG, Class 1-12)
- Multiple sections (A, B, C) for each class with appropriate capacities
- Students for each class with realistic:
  - Age-appropriate date of birth
  - Parent information
  - Contact details
  - Address details
  - Academic records

### Run All Seeds at Once
To run all seed scripts in the correct order:

```bash
npm run db:seed:all
```

## Notes

- The seed scripts are idempotent and will skip creating records that already exist.
- Student admission numbers follow a specific format: BranchPrefix + Year + Random Number
- Each student is associated with a parent record and an academic record
- Students have realistic age distribution based on their class
- Parent records include father, mother, and guardian information where applicable

## Requirements

Before running the seed scripts, ensure:
1. Your database connection is properly configured in your `.env` file
2. You have run the necessary migrations (`npm run db:migrate` or `npm run db:push`)
3. You have the necessary permissions to write to the database

## Troubleshooting

- If you encounter unique constraint violations, it likely means you're trying to create a record that already exists
- If you want to start with a clean database, you can reset your database and run migrations again before seeding 