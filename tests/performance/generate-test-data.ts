/**
 * Test Data Generation Script
 * Generates realistic test data for performance testing
 *
 * Usage:
 *   node generate-test-data.ts [--users=1000] [--classes=500] [--bookings=5000]
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = parseInt(value) || value;
  return acc;
}, {} as Record<string, any>);

const NUM_STUDENTS = args.users || 1000;
const NUM_TEACHERS = args.teachers || 50;
const NUM_CLASSES = args.classes || 500;
const NUM_BOOKINGS = args.bookings || 5000;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Generate student test data
 */
async function generateStudents(count: number): Promise<string[]> {
  console.log(`📊 Generating ${count} student accounts...`);
  const students: any[] = [];
  const studentIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();

    students.push({
      email,
      password: 'TestPassword123!', // All test users have same password
      role: 'student',
      full_name: `${firstName} ${lastName}`,
      gem_balance: faker.number.int({ min: 0, max: 500 }),
      created_at: faker.date.past({ years: 1 }),
    });
  }

  // Batch insert students
  const batchSize = 100;
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize);

    const { data, error } = await supabase.auth.admin.createUser({
      email: batch[0].email,
      password: batch[0].password,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        full_name: batch[0].full_name,
      },
    });

    if (error) {
      console.error(`❌ Error creating student ${batch[0].email}:`, error.message);
    } else if (data.user) {
      studentIds.push(data.user.id);

      // Insert profile with gem balance
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: batch[0].full_name,
        role: 'student',
        gem_balance: batch[0].gem_balance,
      });
    }

    if ((i + batchSize) % 1000 === 0) {
      console.log(`  ✓ Created ${Math.min(i + batchSize, count)} students...`);
    }
  }

  console.log(`✅ Generated ${studentIds.length} students`);
  return studentIds;
}

/**
 * Generate teacher test data
 */
async function generateTeachers(count: number): Promise<string[]> {
  console.log(`👨‍🏫 Generating ${count} teacher accounts...`);
  const teachers: any[] = [];
  const teacherIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `teacher.${faker.internet.email({ firstName, lastName }).toLowerCase()}`;

    teachers.push({
      email,
      password: 'TestPassword123!',
      role: 'teacher',
      full_name: `${firstName} ${lastName}`,
      bio: faker.lorem.sentence(),
      rating: faker.number.float({ min: 4.0, max: 5.0, precision: 0.1 }),
    });
  }

  // Create teacher accounts
  for (const teacher of teachers) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: teacher.email,
      password: teacher.password,
      email_confirm: true,
      user_metadata: {
        role: 'teacher',
        full_name: teacher.full_name,
      },
    });

    if (error) {
      console.error(`❌ Error creating teacher ${teacher.email}:`, error.message);
    } else if (data.user) {
      teacherIds.push(data.user.id);

      // Insert teacher profile
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: teacher.full_name,
        role: 'teacher',
        bio: teacher.bio,
        rating: teacher.rating,
      });
    }
  }

  console.log(`✅ Generated ${teacherIds.length} teachers`);
  return teacherIds;
}

/**
 * Generate class test data
 */
async function generateClasses(teacherIds: string[], count: number): Promise<string[]> {
  console.log(`📚 Generating ${count} classes...`);
  const classes: any[] = [];
  const classIds: string[] = [];

  const topics = [
    'Business English',
    'Conversational English',
    'IELTS Preparation',
    'TOEFL Preparation',
    'Grammar Fundamentals',
    'Pronunciation Practice',
    'English for Travelers',
    'Academic Writing',
    'Job Interview Skills',
    'English Literature',
  ];

  for (let i = 0; i < count; i++) {
    const teacherId = teacherIds[Math.floor(Math.random() * teacherIds.length)];
    const startDate = faker.date.future({ years: 0.5 });

    classes.push({
      teacher_id: teacherId,
      title: faker.helpers.arrayElement(topics),
      description: faker.lorem.paragraph(),
      schedule: startDate.toISOString(),
      duration_minutes: 25,
      capacity: faker.number.int({ min: 5, max: 20 }),
      price: faker.number.float({ min: 10, max: 50, precision: 0.01 }),
      level: faker.helpers.arrayElement(['Beginner', 'Intermediate', 'Advanced']),
      status: 'scheduled',
    });
  }

  // Batch insert classes
  const { data, error } = await supabase
    .from('classes')
    .insert(classes)
    .select('id');

  if (error) {
    console.error('❌ Error creating classes:', error.message);
  } else if (data) {
    classIds.push(...data.map((c: any) => c.id));
  }

  console.log(`✅ Generated ${classIds.length} classes`);
  return classIds;
}

/**
 * Generate booking test data
 */
async function generateBookings(
  studentIds: string[],
  classIds: string[],
  count: number
): Promise<void> {
  console.log(`🎟️ Generating ${count} bookings...`);
  const bookings: any[] = [];

  for (let i = 0; i < count; i++) {
    const studentId = studentIds[Math.floor(Math.random() * studentIds.length)];
    const classId = classIds[Math.floor(Math.random() * classIds.length)];
    const price = faker.number.float({ min: 10, max: 50, precision: 0.01 });
    const gemsUsed = faker.number.int({ min: 0, max: 50 });
    const gemDiscount = gemsUsed * 0.5;
    const finalPrice = Math.max(5, price - gemDiscount); // $5 minimum

    bookings.push({
      student_id: studentId,
      class_id: classId,
      original_price: price,
      gems_used: gemsUsed,
      gem_discount: gemDiscount,
      final_price: finalPrice,
      status: faker.helpers.arrayElement(['confirmed', 'completed', 'cancelled']),
      booking_date: faker.date.past({ years: 0.5 }),
    });
  }

  // Batch insert bookings
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < bookings.length; i += batchSize) {
    const batch = bookings.slice(i, i + batchSize);

    const { error } = await supabase.from('bookings').insert(batch);

    if (error) {
      console.error(`❌ Error creating bookings batch ${i}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`  ✓ Created ${inserted} bookings...`);
    }
  }

  console.log(`✅ Generated ${inserted} bookings`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting test data generation...\n');
  console.log(`Configuration:`);
  console.log(`  - Students: ${NUM_STUDENTS}`);
  console.log(`  - Teachers: ${NUM_TEACHERS}`);
  console.log(`  - Classes: ${NUM_CLASSES}`);
  console.log(`  - Bookings: ${NUM_BOOKINGS}\n`);

  try {
    // Step 1: Generate users
    const studentIds = await generateStudents(NUM_STUDENTS);
    const teacherIds = await generateTeachers(NUM_TEACHERS);

    // Step 2: Generate classes
    const classIds = await generateClasses(teacherIds, NUM_CLASSES);

    // Step 3: Generate bookings
    await generateBookings(studentIds, classIds, NUM_BOOKINGS);

    console.log('\n✨ Test data generation complete!');
    console.log('\n📊 Summary:');
    console.log(`  - Total students: ${studentIds.length}`);
    console.log(`  - Total teachers: ${teacherIds.length}`);
    console.log(`  - Total classes: ${classIds.length}`);
    console.log(`  - Total bookings: ${NUM_BOOKINGS}`);

    console.log('\n💡 Test credentials:');
    console.log('  - All users have password: TestPassword123!');
    console.log('  - Example student: First generated student email');
    console.log('  - Example teacher: First generated teacher email');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Execute
main();
