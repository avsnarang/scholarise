import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting branch and academic session seed script...');

  try {
    // Check if branches and academic sessions already exist
    const existingAcademicSession = await prisma.academicSession.findMany();
    console.log(`Found ${existingAcademicSession.length} existing academic sessions`);
    const existingBranches = await prisma.branch.findMany();
    console.log(`Found ${existingBranches.length} existing branches`);

    if (existingAcademicSession.length === 0) {
      const academicSession = [
        {
          name: "2023-24",
          startDate: new Date("2023-04-01"),
          endDate: new Date("2024-03-31"),
          isActive: false,
        },
        {
          name: "2024-25",
          startDate: new Date("2024-04-01"),
          endDate: new Date("2025-03-31"),
          isActive: false,
        },
        {
          name: "2025-26",
          startDate: new Date("2025-04-01"),
          endDate: new Date("2026-03-31"),
          isActive: true,
        },
      ];

      for (const session of academicSession) {
        await prisma.academicSession.create({
          data: session,
        });
        console.log(`Created academic session: ${session.name}`);
      }
      console.log("Academic session created successfully");
    } else {
      console.log("Academic session already exists. Skipping seed.");
    }

    if (existingBranches.length === 0) {
      console.log("No branches found. Creating default branches...");
      // Create default branches
      const branches = [
        {
          name: "Paonta Sahib",
          code: "PS",
          address: "Jamniwala Road, Badripur",
          city: "Paonta Sahib",
          state: "Himachal Pradesh",
          country: "India",
          phone: "+91 8627800056",
          order: 1,
        },
        {
          name: "Juniors",
          code: "JUN",
          address: "Near Degree College, Devinagar",
          city: "Paonta Sahib",
          state: "Himachal Pradesh",
          country: "India",
          phone: "+91 9805735656",
          order: 2,
        },
        {
          name: "Majra",
          code: "MAJ",
          address: "Near SBI, Majra",
          city: "Paonta Sahib",
          state: "Himachal Pradesh",
          country: "India",
          phone: "+91 9692700056",
          order: 3,
        },
      ];

      // Insert branches
      for (const branch of branches) {
        await prisma.branch.create({
          data: branch,
        });
        console.log(`Created branch: ${branch.name} (${branch.code})`);
      }

      console.log("Default branches created successfully");
    } else {
      console.log("Branches already exist. Skipping seed.");
    }
  } catch (error) {
    console.error("Error seeding branches and academic sessions:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => console.log("Branch and academic session seed completed"))
  .catch((e) => {
    console.error("Error in branch and academic session seed script:", e);
    process.exit(1);
  });
